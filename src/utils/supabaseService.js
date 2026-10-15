import { supabase } from './supabase';
import { calculateMonthsElapsed, generateMonthList, calculateMemberMetrics } from './memberCalculations';
import {
  calcProjectMetrics,
  syncProjectFinancials,
  deriveInterestPercentage,
  calculateProjectMonthsElapsed,
  generateProjectMonthsList
} from './investmentCalculations';

// --- HELPER MAPPERS (Snake <-> Camel & ID mapping) ---

export const mapMemberFromDb = (m) => {
  if (!m) return null;
  return {
    _id: m.id,
    id: m.id,
    memberId: m.member_id,
    name: m.name,
    mobile: m.mobile,
    address: m.address,
    nid: m.nid,
    joiningDate: m.joining_date,
    monthlyDepositAmount: Number(m.monthly_deposit_amount || 0),
    status: m.status,
    photoUrl: m.photo_url || m.photoUrl || '',
    nidFrontUrl: m.nid_front_url || m.nidFrontUrl || '',
    nidBackUrl: m.nid_back_url || m.nidBackUrl || '',
    createdAt: m.created_at,
    updatedAt: m.updated_at
  };
};

export const mapProjectFromDb = (p) => {
  if (!p) return null;
  const projectObj = {
    _id: p.id,
    id: p.id,
    projectName: p.project_name,
    projectType: p.project_type,
    driverName: p.driver_name,
    driverMobile: p.driver_mobile,
    driverAddress: p.driver_address,
    driverNid: p.driver_nid,
    nomineeName: p.nominee_name,
    nomineeMobile: p.nominee_mobile,
    investmentAmount: Number(p.investment_amount || 0),
    interestPercentage: p.interest_percentage != null ? Number(p.interest_percentage) : null,
    returnAmount: Number(p.return_amount || 0),
    startDate: p.start_date,
    installmentDuration: Number(p.installment_duration || 0),
    monthlyInstallmentAmount: Number(p.monthly_installment_amount || 0),
    status: p.status,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
  projectObj.interestPercentage = deriveInterestPercentage(projectObj);
  return projectObj;
};

export const mapDepositFromDb = (d, memberMap = {}, userMap = {}) => {
  if (!d) return null;
  const populatedMember = memberMap[d.member_id] || (typeof d.members === 'object' && d.members ? mapMemberFromDb(d.members) : null);
  const populatedUser = userMap[d.recorded_by] || (typeof d.profiles === 'object' && d.profiles ? d.profiles : null);

  return {
    _id: d.id,
    id: d.id,
    member: populatedMember || d.member_id,
    amount: Number(d.amount || 0),
    date: d.date,
    month: d.month,
    recordedBy: populatedUser ? { _id: populatedUser.id, name: populatedUser.name } : null,
    createdAt: d.created_at
  };
};

export const mapInstallmentFromDb = (inst, projectMap = {}, userMap = {}) => {
  if (!inst) return null;
  const populatedProject = projectMap[inst.project_id] || (typeof inst.projects === 'object' && inst.projects ? mapProjectFromDb(inst.projects) : null);
  const populatedUser = userMap[inst.recorded_by] || (typeof inst.profiles === 'object' && inst.profiles ? inst.profiles : null);

  return {
    _id: inst.id,
    id: inst.id,
    project: populatedProject || inst.project_id,
    amount: Number(inst.amount || 0),
    date: inst.date,
    month: inst.month,
    recordedBy: populatedUser ? { _id: populatedUser.id, name: populatedUser.name } : null,
    createdAt: inst.created_at
  };
};

export const mapExpenseFromDb = (exp, userMap = {}) => {
  if (!exp) return null;
  const populatedUser = userMap[exp.recorded_by] || (typeof exp.profiles === 'object' && exp.profiles ? exp.profiles : null);

  return {
    _id: exp.id,
    id: exp.id,
    title: exp.title,
    amount: Number(exp.amount || 0),
    date: exp.date,
    category: exp.category,
    description: exp.description,
    recordedBy: populatedUser ? { _id: populatedUser.id, name: populatedUser.name } : null,
    createdAt: exp.created_at
  };
};

export const mapUserFromDb = (u, memberMap = {}) => {
  if (!u) return null;
  const populatedMember = u.member_id ? (memberMap[u.member_id] || u.members ? mapMemberFromDb(u.members) : null) : null;
  return {
    _id: u.id,
    id: u.id,
    name: u.name,
    mobile: u.mobile,
    username: u.username,
    role: u.role,
    status: u.status,
    memberId: populatedMember || u.member_id || null,
    createdAt: u.created_at
  };
};

// --- AUTH SERVICES ---

export const authService = {
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('ফোন নম্বর/ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন');
    }
    const cleanId = String(identifier).trim();
    let email = null;

    if (cleanId.includes('@')) {
      email = cleanId.toLowerCase();
    } else {
      // 1. Resolve email via get_login_email RPC (matches mobile or username in profiles)
      try {
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_login_email', {
          p_identifier: cleanId
        });
        if (!rpcError && resolvedEmail) {
          email = resolvedEmail;
        }
      } catch (err) {
        console.warn('get_login_email RPC call skipped or failed:', err);
      }

      // 2. Fallback if RPC didn't return an email
      if (!email) {
        email = `${cleanId.toLowerCase()}@somiti.com`;
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new Error('ভুল ফোন নম্বর, ইউজারনেম বা পাসওয়ার্ড');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, members(*)')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      throw new Error('ব্যবহারকারী প্রোফাইল পাওয়া যায়নি');
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      throw new Error('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় রয়েছে');
    }

    const mapped = mapUserFromDb(profile);
    mapped.token = authData.session.access_token;
    return mapped;
  },

  async getMe() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error('সেশন পাওয়া যায়নি');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, members(*)')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('ব্যবহারকারী পাওয়া যায়নি');
    }

    return mapUserFromDb(profile);
  },

  async logout() {
    await supabase.auth.signOut();
  }
};

// --- USERS MANAGEMENT (Admin) ---

export const usersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, members(*)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(u => mapUserFromDb(u));
  },

  async create(body) {
    let { name, mobile, username, password, role, status, memberId } = body;
    if (!name || !mobile || !username || !password) {
      throw new Error('নাম, মোবাইল, ইউজারনেম এবং পাসওয়ার্ড পূরণ করা আবশ্যক');
    }

    const { data, error } = await supabase.rpc('admin_create_user', {
      p_name: name.trim(),
      p_mobile: mobile.trim(),
      p_username: username.trim().toLowerCase(),
      p_password: password,
      p_role: role || 'member',
      p_status: status || 'active',
      p_member_id: memberId || null
    });

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        throw new Error('ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে');
      }
      throw new Error(error.message);
    }

    return data;
  },

  async update(id, body) {
    const { data, error } = await supabase.rpc('admin_update_user', {
      p_user_id: id,
      p_name: body.name?.trim(),
      p_mobile: body.mobile?.trim(),
      p_username: body.username?.trim().toLowerCase(),
      p_password: body.password || null,
      p_role: body.role || 'member',
      p_status: body.status || 'active',
      p_member_id: body.memberId || null
    });

    if (error) throw new Error(error.message);
    return data;
  },

  async delete(id) {
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: id });
    if (error) throw new Error(error.message);
    return { message: 'ব্যবহারকারী মুছে ফেলা হয়েছে' };
  }
};

// --- MEMBERS SERVICES ---

export const membersService = {
  async getAll() {
    const [{ data: members, error: memErr }, { data: deposits, error: depErr }] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('deposits').select('id, member_id, amount')
    ]);

    if (memErr) throw new Error(memErr.message);
    if (depErr) throw new Error(depErr.message);

    const depositsList = deposits || [];

    return (members || []).map((m) => {
      const mapped = mapMemberFromDb(m);
      const metrics = calculateMemberMetrics(mapped, depositsList);
      return {
        ...mapped,
        ...metrics
      };
    });
  },

  async getById(id) {
    const [{ data: member, error: memErr }, { data: deposits, error: depErr }] = await Promise.all([
      supabase.from('members').select('*').eq('id', id).single(),
      supabase.from('deposits').select('*, profiles(id, name)').eq('member_id', id).order('date', { ascending: false })
    ]);

    if (memErr || !member) throw new Error('সদস্য পাওয়া যায়নি');
    if (depErr) throw new Error(depErr.message);

    const mappedMember = mapMemberFromDb(member);
    const mappedDeposits = (deposits || []).map(d => mapDepositFromDb(d));

    const totalDeposited = mappedDeposits.reduce((sum, dep) => sum + dep.amount, 0);
    const monthsElapsed = calculateMonthsElapsed(mappedMember.joiningDate);
    const expectedDeposits = monthsElapsed * mappedMember.monthlyDepositAmount;
    const totalDue = Math.max(0, expectedDeposits - totalDeposited);

    const expectedMonths = generateMonthList(mappedMember.joiningDate);
    const schedule = expectedMonths.map((mStr) => {
      const monthDeposits = mappedDeposits.filter((d) => d.month === mStr);
      const paidAmount = monthDeposits.reduce((sum, d) => sum + d.amount, 0);
      const isPaid = paidAmount >= mappedMember.monthlyDepositAmount;

      return {
        month: mStr,
        expectedAmount: mappedMember.monthlyDepositAmount,
        paidAmount,
        isPaid,
        status: isPaid ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'DUE'),
        deposits: monthDeposits
      };
    });

    return {
      member: mappedMember,
      calculations: {
        totalDeposited,
        expectedDeposits,
        totalDue,
        currentBalance: totalDeposited,
        monthsElapsed
      },
      schedule,
      deposits: mappedDeposits
    };
  },

  async uploadDocument(file, type = 'photo') {
    if (!file) return null;
    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanType = type.replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `${Date.now()}_${cleanType}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${cleanType}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('member-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`ফাইল আপলোড করতে সমস্যা হয়েছে: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('member-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async create(body) {
    const { name, mobile, address, nid, joiningDate, monthlyDepositAmount, status, photoUrl, nidFrontUrl, nidBackUrl } = body;
    const { data, error } = await supabase
      .from('members')
      .insert({
        name,
        mobile,
        address,
        nid,
        joining_date: joiningDate,
        monthly_deposit_amount: Number(monthlyDepositAmount),
        status: status || 'active',
        photo_url: photoUrl || null,
        nid_front_url: nidFrontUrl || null,
        nid_back_url: nidBackUrl || null
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapMemberFromDb(data);
  },

  async update(id, body) {
    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.mobile !== undefined) updateData.mobile = body.mobile;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.nid !== undefined) updateData.nid = body.nid;
    if (body.joiningDate !== undefined) updateData.joining_date = body.joiningDate;
    if (body.monthlyDepositAmount !== undefined) updateData.monthly_deposit_amount = Number(body.monthlyDepositAmount);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.photoUrl !== undefined) updateData.photo_url = body.photoUrl;
    if (body.nidFrontUrl !== undefined) updateData.nid_front_url = body.nidFrontUrl;
    if (body.nidBackUrl !== undefined) updateData.nid_back_url = body.nidBackUrl;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapMemberFromDb(data);
  },

  async recordDeposit(memberId, body) {
    const { amount, month, date } = body;
    if (!amount || Number(amount) <= 0) throw new Error('সঠিক জমার পরিমাণ দিন');
    if (!month) throw new Error('মাস উল্লেখ করুন');

    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('deposits')
      .insert({
        member_id: memberId,
        amount: Number(amount),
        month,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        recorded_by: session?.user?.id || null
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapDepositFromDb(data);
  },

  async getHistory(memberId) {
    const { data, error } = await supabase
      .from('deposits')
      .select('*, profiles(id, name)')
      .eq('member_id', memberId)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(d => mapDepositFromDb(d));
  },

  async delete(id) {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'সদস্য এবং তার সংশ্লিষ্ট সমস্ত তথ্য সফলভাবে মুছে ফেলা হয়েছে' };
  },

  async deleteDeposit(depositId) {
    const { error } = await supabase.from('deposits').delete().eq('id', depositId);
    if (error) throw new Error(error.message);
    return { message: 'জমার রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে' };
  }
};

// --- PROJECTS SERVICES ---

export const projectsService = {
  async getAll() {
    const [{ data: projects, error: projErr }, { data: installments, error: instErr }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('installments').select('id, project_id, amount, date')
    ]);

    if (projErr) throw new Error(projErr.message);
    if (instErr) throw new Error(instErr.message);

    const allInstallments = installments || [];

    return (projects || []).map((p) => {
      const projectObj = mapProjectFromDb(p);
      const projInsts = allInstallments.filter(i => String(i.project_id) === String(p.id));
      const totalPaid = projInsts.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
      const metrics = calcProjectMetrics(projectObj, totalPaid, null, projInsts);

      return {
        ...projectObj,
        ...metrics
      };
    });
  },

  async getById(id) {
    const [{ data: project, error: projErr }, { data: installments, error: instErr }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('installments').select('*, profiles(id, name)').eq('project_id', id).order('date', { ascending: false })
    ]);

    if (projErr || !project) throw new Error('প্রজেক্ট পাওয়া যায়নি');
    if (instErr) throw new Error(instErr.message);

    const projectObj = mapProjectFromDb(project);
    const mappedInstallments = (installments || []).map(i => mapInstallmentFromDb(i));
    const totalPaid = mappedInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    const metrics = calcProjectMetrics(projectObj, totalPaid, null, mappedInstallments);

    const durationMonthsList = generateProjectMonthsList(projectObj.startDate, projectObj.installmentDuration);
    const currentStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    const schedule = durationMonthsList.map((mStr) => {
      const monthInstallments = mappedInstallments.filter((inst) => inst.month === mStr);
      const paidAmount = monthInstallments.reduce((sum, inst) => sum + inst.amount, 0);
      const isPaid = paidAmount >= projectObj.monthlyInstallmentAmount;

      let status = 'DUE';
      if (isPaid) {
        status = 'PAID';
      } else if (paidAmount > 0) {
        status = 'PARTIAL';
      } else if (mStr > currentStr) {
        status = 'UPCOMING';
      }

      return {
        month: mStr,
        expectedAmount: projectObj.monthlyInstallmentAmount,
        paidAmount,
        status,
        installments: monthInstallments
      };
    });

    return {
      project: projectObj,
      calculations: metrics,
      schedule,
      installments: mappedInstallments
    };
  },

  async create(body) {
    const financials = syncProjectFinancials({ ...body, lastEdited: body.lastEdited });

    const insertData = {
      project_name: body.projectName,
      project_type: body.projectType,
      driver_name: body.driverName,
      driver_mobile: body.driverMobile,
      driver_address: body.driverAddress,
      driver_nid: body.driverNid,
      nominee_name: body.nomineeName,
      nominee_mobile: body.nomineeMobile,
      investment_amount: financials.investmentAmount,
      interest_percentage: financials.interestPercentage,
      return_amount: financials.returnAmount,
      start_date: body.startDate,
      installment_duration: financials.installmentDuration,
      monthly_installment_amount: financials.monthlyInstallmentAmount,
      status: body.status || 'active'
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapProjectFromDb(data);
  },

  async update(id, body) {
    const { data: currentProject, error: findErr } = await supabase.from('projects').select('*').eq('id', id).single();
    if (findErr || !currentProject) throw new Error('প্রজেক্ট পাওয়া যায়নি');

    const mappedCurrent = mapProjectFromDb(currentProject);
    const financials = syncProjectFinancials({
      investmentAmount: body.investmentAmount ?? mappedCurrent.investmentAmount,
      interestPercentage: body.interestPercentage ?? mappedCurrent.interestPercentage,
      returnAmount: body.returnAmount ?? mappedCurrent.returnAmount,
      installmentDuration: body.installmentDuration ?? mappedCurrent.installmentDuration,
      lastEdited: body.lastEdited
    });

    const updateData = {
      project_name: body.projectName || mappedCurrent.projectName,
      project_type: body.projectType || mappedCurrent.projectType,
      driver_name: body.driverName || mappedCurrent.driverName,
      driver_mobile: body.driverMobile || mappedCurrent.driverMobile,
      driver_address: body.driverAddress || mappedCurrent.driverAddress,
      driver_nid: body.driverNid || mappedCurrent.driverNid,
      nominee_name: body.nomineeName || mappedCurrent.nomineeName,
      nominee_mobile: body.nomineeMobile || mappedCurrent.nomineeMobile,
      start_date: body.startDate || mappedCurrent.startDate,
      status: body.status || mappedCurrent.status,
      investment_amount: financials.investmentAmount,
      interest_percentage: financials.interestPercentage,
      return_amount: financials.returnAmount,
      installment_duration: financials.installmentDuration,
      monthly_installment_amount: financials.monthlyInstallmentAmount,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapProjectFromDb(data);
  },

  async collectInstallment(projectId, body) {
    const { amount, month, date } = body;
    if (!amount || Number(amount) <= 0) throw new Error('সঠিক কিস্তির পরিমাণ দিন');
    if (!month) throw new Error('মাস উল্লেখ করুন');

    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('installments')
      .insert({
        project_id: projectId,
        amount: Number(amount),
        month,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        recorded_by: session?.user?.id || null
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapInstallmentFromDb(data);
  },

  async getHistory(projectId) {
    const { data, error } = await supabase
      .from('installments')
      .select('*, profiles(id, name)')
      .eq('project_id', projectId)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(i => mapInstallmentFromDb(i));
  },

  async delete(id) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'প্রজেক্ট এবং তার সংশ্লিষ্ট সমস্ত কিস্তির রেকর্ড সফলভাবে মুছে ফেলা হয়েছে' };
  },

  async deleteInstallment(installmentId) {
    const { error } = await supabase.from('installments').delete().eq('id', installmentId);
    if (error) throw new Error(error.message);
    return { message: 'কিস্তির রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে' };
  }
};

// --- EXPENSES SERVICES ---

export const expensesService = {
  async getAll(queryParams = {}) {
    let query = supabase.from('expenses').select('*, profiles(id, name)').order('date', { ascending: false });

    const { date, month, year, startDate, endDate, category } = queryParams;

    if (date) {
      const s = new Date(date);
      s.setHours(0, 0, 0, 0);
      const e = new Date(date);
      e.setHours(23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (month) {
      const [y, m] = month.split('-');
      const s = new Date(parseInt(y), parseInt(m) - 1, 1);
      const e = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (year) {
      const s = new Date(parseInt(year), 0, 1);
      const e = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(exp => mapExpenseFromDb(exp));
  },

  async create(body) {
    const { title, amount, date, category, description } = body;
    if (!title || !amount || Number(amount) <= 0) {
      throw new Error('সঠিক শিরোনাম ও খরচের পরিমাণ দিন');
    }

    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        title,
        amount: Number(amount),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        category: category || 'other',
        description: description || '',
        recorded_by: session?.user?.id || null
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapExpenseFromDb(data);
  },

  async update(id, body) {
    const updateData = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.amount !== undefined) updateData.amount = Number(body.amount);
    if (body.date !== undefined) updateData.date = new Date(body.date).toISOString();
    if (body.category !== undefined) updateData.category = body.category;
    if (body.description !== undefined) updateData.description = body.description;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapExpenseFromDb(data);
  },

  async delete(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'খরচ সফলভাবে মুছে ফেলা হয়েছে' };
  }
};

// --- REPORTS SERVICES ---

export const reportsService = {
  async getDashboard() {
    const [
      { data: members },
      { data: deposits },
      { data: projects },
      { data: installments },
      { data: expenses }
    ] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('deposits').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('installments').select('*'),
      supabase.from('expenses').select('*')
    ]);

    const memList = (members || []).map(mapMemberFromDb);
    const depList = (deposits || []).map(d => mapDepositFromDb(d));
    const projList = (projects || []).map(mapProjectFromDb);
    const instList = (installments || []).map(i => mapInstallmentFromDb(i));
    const expList = (expenses || []).map(e => mapExpenseFromDb(e));

    const totalMembers = memList.length;
    const totalDeposits = depList.reduce((sum, dep) => sum + dep.amount, 0);

    let memberDueAmount = 0;
    for (const member of memList) {
      const memberDeposits = depList.filter(dep => String(dep.member?._id || dep.member) === String(member._id));
      const totalMemberDeposited = memberDeposits.reduce((sum, dep) => sum + dep.amount, 0);
      const monthsElapsed = calculateMonthsElapsed(member.joiningDate);
      const expectedDeposits = monthsElapsed * member.monthlyDepositAmount;
      const memberDue = Math.max(0, expectedDeposits - totalMemberDeposited);
      memberDueAmount += memberDue;
    }

    const totalInvestments = projList.reduce((sum, proj) => sum + proj.investmentAmount, 0);
    const totalInstallmentsCollected = instList.reduce((sum, inst) => sum + inst.amount, 0);

    let projectDueAmount = 0;
    for (const project of projList) {
      const projInsts = instList.filter(inst => String(inst.project?._id || inst.project) === String(project._id));
      const totalPaid = projInsts.reduce((sum, inst) => sum + inst.amount, 0);
      const metrics = calcProjectMetrics(project, totalPaid, calculateProjectMonthsElapsed(project.startDate), projInsts);
      projectDueAmount += metrics.totalDue;
    }

    const totalProfit = projList.reduce((sum, proj) => sum + (proj.returnAmount - proj.investmentAmount), 0);

    const totalRealizedProfit = projList.reduce((sum, proj) => {
      const projInsts = instList.filter(inst => String(inst.project?._id || inst.project) === String(proj._id));
      const totalPaid = projInsts.reduce((s, inst) => s + inst.amount, 0);
      const earnedProfit = Math.max(0, totalPaid - proj.investmentAmount);
      return sum + earnedProfit;
    }, 0);

    const activeProjects = projList.filter(p => p.status === 'active').length;
    const totalExpenses = expList.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      totalMembers,
      totalDeposits,
      totalDueAmount: memberDueAmount + projectDueAmount,
      memberDueAmount,
      projectDueAmount,
      totalInvestments,
      totalInstallmentsCollected,
      totalProfit,
      totalRealizedProfit: Math.round(totalRealizedProfit),
      activeProjects,
      totalExpenses
    };
  },

  async getMemberDeposits(queryParams = {}) {
    let query = supabase.from('deposits').select('*, members(*), profiles(id, name)').order('date', { ascending: false });

    const { date, month, year, startDate, endDate } = queryParams;
    if (date) {
      const s = new Date(date);
      s.setHours(0, 0, 0, 0);
      const e = new Date(date);
      e.setHours(23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (month) {
      const [y, m] = month.split('-');
      const s = new Date(parseInt(y), parseInt(m) - 1, 1);
      const e = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (year) {
      const s = new Date(parseInt(year), 0, 1);
      const e = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(d => mapDepositFromDb(d));
  },

  async getMemberDues() {
    const [{ data: members }, { data: deposits }] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('deposits').select('*')
    ]);

    const memList = (members || []).map(mapMemberFromDb);
    const depList = (deposits || []).map(d => mapDepositFromDb(d));

    return memList.map(member => {
      const memberDeposits = depList.filter(dep => String(dep.member?._id || dep.member) === String(member._id));
      const totalDeposited = memberDeposits.reduce((sum, dep) => sum + dep.amount, 0);
      const monthsElapsed = calculateMonthsElapsed(member.joiningDate);
      const expectedDeposits = monthsElapsed * member.monthlyDepositAmount;
      const totalDue = Math.max(0, expectedDeposits - totalDeposited);

      return {
        _id: member._id,
        memberId: member.memberId,
        name: member.name,
        mobile: member.mobile,
        monthlyDepositAmount: member.monthlyDepositAmount,
        totalDeposited,
        totalDue,
        status: member.status
      };
    }).filter(m => m.totalDue > 0);
  },

  async getProjectCollections(queryParams = {}) {
    let query = supabase.from('installments').select('*, projects(*), profiles(id, name)').order('date', { ascending: false });

    const { date, month, year, startDate, endDate } = queryParams;
    if (date) {
      const s = new Date(date);
      s.setHours(0, 0, 0, 0);
      const e = new Date(date);
      e.setHours(23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (month) {
      const [y, m] = month.split('-');
      const s = new Date(parseInt(y), parseInt(m) - 1, 1);
      const e = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    } else if (year) {
      const s = new Date(parseInt(year), 0, 1);
      const e = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      query = query.gte('date', s.toISOString()).lte('date', e.toISOString());
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(i => mapInstallmentFromDb(i));
  },

  async getProjectDues() {
    const [{ data: projects }, { data: installments }] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('installments').select('*')
    ]);

    const projList = (projects || []).map(mapProjectFromDb);
    const instList = (installments || []).map(i => mapInstallmentFromDb(i));

    return projList.map(project => {
      const projInsts = instList.filter(inst => String(inst.project?._id || inst.project) === String(project._id));
      const totalPaid = projInsts.reduce((sum, inst) => sum + inst.amount, 0);
      const metrics = calcProjectMetrics(project, totalPaid, calculateProjectMonthsElapsed(project.startDate), projInsts);

      return {
        _id: project._id,
        projectName: project.projectName,
        projectType: project.projectType,
        driverName: project.driverName,
        investmentAmount: project.investmentAmount,
        returnAmount: project.returnAmount,
        monthlyInstallmentAmount: project.monthlyInstallmentAmount,
        totalPaid,
        totalDue: metrics.totalDue,
        remainingBalance: metrics.remainingBalance,
        totalPayable: metrics.totalPayable,
        status: project.status
      };
    }).filter(p => p.totalDue > 0);
  },

  async getProfits() {
    const [{ data: projects }, { data: installments }] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('installments').select('*')
    ]);

    const projList = (projects || []).map(mapProjectFromDb);
    const instList = (installments || []).map(i => mapInstallmentFromDb(i));

    return projList.map(project => {
      const projInsts = instList.filter(inst => String(inst.project?._id || inst.project) === String(project._id));
      const totalPaid = projInsts.reduce((sum, inst) => sum + inst.amount, 0);
      const metrics = calcProjectMetrics(project, totalPaid, calculateProjectMonthsElapsed(project.startDate), projInsts);

      return {
        _id: project._id,
        projectName: project.projectName,
        projectType: project.projectType,
        driverName: project.driverName,
        driverMobile: project.driverMobile,
        investmentAmount: project.investmentAmount,
        returnAmount: project.returnAmount,
        totalPaid,
        profit: metrics.profit,
        currentProfit: metrics.currentProfit,
        futureProfit: metrics.futureProfit,
        totalPayable: metrics.totalPayable,
        status: project.status
      };
    });
  },

  async getMemberSummary() {
    const [
      { data: members },
      { data: deposits },
      { data: projects },
      { data: installments },
      { data: expenses }
    ] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('deposits').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('installments').select('*'),
      supabase.from('expenses').select('*')
    ]);

    const memList = (members || []).map(mapMemberFromDb);
    const depList = (deposits || []).map(d => mapDepositFromDb(d));
    const projList = (projects || []).map(mapProjectFromDb);
    const instList = (installments || []).map(i => mapInstallmentFromDb(i));
    const expList = (expenses || []).map(e => mapExpenseFromDb(e));

    const totalExpenses = expList.reduce((sum, exp) => sum + exp.amount, 0);
    const totalInstallmentsCollected = instList.reduce((sum, inst) => sum + inst.amount, 0);
    const totalInvestments = projList.reduce((sum, proj) => sum + proj.investmentAmount, 0);
    const totalTargetReturn = projList.reduce((sum, proj) => sum + proj.returnAmount, 0);

    const totalDeposits = depList.reduce((sum, dep) => sum + dep.amount, 0);
    const currentBalance = totalDeposits + totalInstallmentsCollected - totalInvestments - totalExpenses;

    const totalRemainingProjectReturn = projList.reduce((sum, proj) => {
      const projInsts = instList.filter(inst => String(inst.project?._id || inst.project) === String(proj._id));
      const totalPaid = projInsts.reduce((s, inst) => s + inst.amount, 0);
      const metrics = calcProjectMetrics(proj, totalPaid, calculateProjectMonthsElapsed(proj.startDate), projInsts);
      return sum + metrics.remainingBalance;
    }, 0);

    const futureBalance = currentBalance + totalRemainingProjectReturn;
    const totalTargetProfit = projList.reduce((sum, proj) => sum + (proj.returnAmount - proj.investmentAmount), 0);

    const totalCurrentProfitEarned = projList.reduce((sum, proj) => {
      const projInsts = instList.filter(inst => String(inst.project?._id || inst.project) === String(proj._id));
      const totalPaid = projInsts.reduce((s, inst) => s + inst.amount, 0);
      const earnedProfit = Math.max(0, totalPaid - proj.investmentAmount);
      return sum + earnedProfit;
    }, 0);

    const currentProfitPool = Math.max(0, totalCurrentProfitEarned - totalExpenses);
    const futureProfitPool = Math.max(0, totalTargetProfit - totalExpenses);

    const memberReport = memList.map(member => {
      const memberDeposits = depList.filter(dep => String(dep.member?._id || dep.member) === String(member._id));
      const totalDeposited = memberDeposits.reduce((sum, dep) => sum + dep.amount, 0);
      const monthsElapsed = calculateMonthsElapsed(member.joiningDate);
      const expectedDeposits = monthsElapsed * member.monthlyDepositAmount;
      const totalDue = Math.max(0, expectedDeposits - totalDeposited);

      const depositShare = totalDeposits > 0 ? totalDeposited / totalDeposits : 0;
      const currentProfit = currentProfitPool * depositShare;
      const futureProfit = futureProfitPool * depositShare;
      const memberCurrentBalance = currentBalance * depositShare;
      const memberFutureBalance = futureBalance * depositShare;

      return {
        _id: member._id,
        memberId: member.memberId,
        name: member.name,
        mobile: member.mobile,
        monthlyDepositAmount: member.monthlyDepositAmount,
        totalDeposited,
        totalDue,
        depositSharePercent: Math.round(depositShare * 10000) / 100,
        currentProfit: Math.round(currentProfit),
        futureProfit: Math.round(futureProfit),
        currentBalance: Math.round(memberCurrentBalance),
        futureBalance: Math.round(memberFutureBalance),
        status: member.status
      };
    });

    return {
      memberReport,
      summary: {
        totalMembers: memList.length,
        totalDeposited: totalDeposits,
        totalMemberDue: memList.reduce((sum, member) => {
          const memberDeposits = depList.filter(dep => String(dep.member?._id || dep.member) === String(member._id));
          const totalDeposited = memberDeposits.reduce((s, dep) => s + dep.amount, 0);
          const monthsElapsed = calculateMonthsElapsed(member.joiningDate);
          const expectedDeposits = monthsElapsed * member.monthlyDepositAmount;
          return sum + Math.max(0, expectedDeposits - totalDeposited);
        }, 0),
        currentBalance,
        futureBalance,
        totalExpenses,
        totalInstallmentsCollected,
        totalInvestments,
        totalTargetReturn,
        totalRemainingProjectReturn,
        currentProfitPool: Math.round(currentProfitPool),
        futureProfitPool: Math.round(futureProfitPool)
      }
    };
  }
};
