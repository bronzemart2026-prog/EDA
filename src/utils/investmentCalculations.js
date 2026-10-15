/**
 * Investment calculation helpers.
 * P = principal (investmentAmount)
 * R = interest percentage
 * T = return target (returnAmount)
 * I = total interest at full term (T - P)
 * N = installment duration in months
 * K = active months elapsed (capped at N)
 */

export const calcReturnTarget = (P, R) => {
  const principal = Number(P);
  const rate = Number(R);
  if (!principal || isNaN(principal) || isNaN(rate)) return null;
  return principal + (principal * rate) / 100;
};

export const calcInterestPercent = (P, T) => {
  const principal = Number(P);
  const target = Number(T);
  if (!principal || isNaN(principal) || isNaN(target) || principal <= 0) return null;
  return ((target - principal) / principal) * 100;
};

export const calcMonthlyInstallment = (T, N) => {
  const target = Number(T);
  const duration = Number(N);
  if (!target || !duration || isNaN(target) || isNaN(duration) || duration <= 0) return null;
  return target / duration;
};

export const deriveInterestPercentage = (project) => {
  if (project.interestPercentage != null && !isNaN(project.interestPercentage)) {
    return Number(project.interestPercentage);
  }
  if (project.interest_percentage != null && !isNaN(project.interest_percentage)) {
    return Number(project.interest_percentage);
  }
  const P = Number(project.investmentAmount || project.investment_amount);
  const T = Number(project.returnAmount || project.return_amount);
  if (!P || P <= 0 || T == null) return 0;
  return calcInterestPercent(P, T) || 0;
};

export const calculateProjectMonthsElapsed = (startDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = new Date();
  if (start > end) return 0;

  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const endYear = end.getFullYear();
  const endMonth = end.getMonth();

  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
};

export const generateProjectMonthsList = (startDate, durationMonths) => {
  if (!startDate || !durationMonths) return [];
  const start = new Date(startDate);
  const list = [];

  for (let i = 0; i < durationMonths; i++) {
    const temp = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = temp.getFullYear();
    const month = String(temp.getMonth() + 1).padStart(2, '0');
    list.push(`${year}-${month}`);
  }

  return list;
};

export const calcProjectMetrics = (project, totalPaid = 0, monthsElapsed = null, installments = []) => {
  const P = Number(project.investmentAmount || project.investment_amount || 0);
  const T = Number(project.returnAmount || project.return_amount || 0);
  const N = Number(project.installmentDuration || project.installment_duration || 0);
  const I = T - P;
  const monthlyInstallment = Number(project.monthlyInstallmentAmount || project.monthly_installment_amount || (N > 0 ? T / N : 0));
  const monthlyInterest = N > 0 ? I / N : 0;
  const monthlyPrincipal = N > 0 ? P / N : 0;

  const elapsed = monthsElapsed != null ? monthsElapsed : calculateProjectMonthsElapsed(project.startDate || project.start_date);
  const activeMonths = Math.min(N, elapsed);
  const K = activeMonths;

  let totalPayable = T; // Default to full target return if not completed/paid off early
  let isCompletedEarly = false;
  let completionK = K;

  if (totalPaid >= P && P > 0) {
    // Principal paid off early
    isCompletedEarly = true;

    if (installments && installments.length > 0) {
      const sortedInst = [...installments].sort((a, b) => new Date(a.date) - new Date(b.date));
      let runningSum = 0;
      let completionDate = null;
      for (const inst of sortedInst) {
        runningSum += Number(inst.amount || 0);
        if (runningSum >= P) {
          completionDate = inst.date;
          break;
        }
      }
      if (completionDate) {
        const start = new Date(project.startDate || project.start_date);
        const end = new Date(completionDate);
        if (start <= end) {
          const startYear = start.getFullYear();
          const startMonth = start.getMonth();
          const endYear = end.getFullYear();
          const endMonth = end.getMonth();
          const calculatedK = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
          completionK = Math.min(N, Math.max(1, calculatedK));
        }
      }
    }
    totalPayable = P + monthlyInterest * completionK;
  }

  const expectedInstallments = K * monthlyInstallment;
  const principalPaid = Math.min(P, totalPaid);
  const interestPaid = Math.max(0, totalPaid - P);
  const duePrincipal = Math.max(0, K * monthlyPrincipal - principalPaid);
  const dueInterest = Math.max(0, K * monthlyInterest - interestPaid);
  let totalDue = duePrincipal + dueInterest;

  if (totalPaid >= P && P > 0) {
    totalDue = 0;
  }

  const remainingBalance = Math.max(0, totalPayable - totalPaid);
  const profit = isCompletedEarly ? (totalPayable - P) : I;
  const currentProfit = Math.max(0, totalPaid - P);
  const principalRemaining = Math.max(0, P - totalPaid);
  const futureProfit = Math.max(0, totalPayable - totalPaid - principalRemaining);

  const isSettled = project.status === 'completed' || remainingBalance === 0;
  const durationMonths = isSettled
    ? (isCompletedEarly ? completionK : K)
    : elapsed;

  return {
    totalPaid,
    monthsElapsed: elapsed,
    activeMonths: isCompletedEarly ? completionK : K,
    interestAmount: isCompletedEarly ? (totalPayable - P) : I,
    monthlyInterest,
    monthlyInstallment,
    totalPayable,
    expectedInstallments,
    totalDue,
    remainingBalance,
    profit,
    currentProfit,
    futureProfit,
    isSettled,
    durationMonths
  };
};

export const syncProjectFinancials = (data) => {
  const P = Number(data.investmentAmount || data.investment_amount);
  const N = Number(data.installmentDuration || data.installment_duration);
  const lastEdited = data.lastEdited || 'percentage';

  if (!P || P <= 0 || !N || N <= 0) {
    throw new Error('বিনিয়োগের পরিমাণ ও কিস্তির মেয়াদ সঠিকভাবে দিন');
  }

  let R;
  let T;

  if (lastEdited === 'returnAmount' && data.returnAmount != null && data.returnAmount !== '') {
    T = Number(data.returnAmount);
    R = calcInterestPercent(P, T);
  } else if (data.interestPercentage != null && data.interestPercentage !== '') {
    R = Number(data.interestPercentage);
    T = calcReturnTarget(P, R);
  } else if (data.returnAmount != null && data.returnAmount !== '') {
    T = Number(data.returnAmount);
    R = calcInterestPercent(P, T);
  } else {
    throw new Error('মুনাফার হার বা ফেরত লক্ষ্যমাত্রা দিন');
  }

  if (T == null || R == null || isNaN(T) || isNaN(R)) {
    throw new Error('বিনিয়োগ হিসাব সঠিক নয়');
  }

  const monthlyInstallmentAmount = calcMonthlyInstallment(T, N);

  return {
    investmentAmount: P,
    interestPercentage: R,
    returnAmount: T,
    installmentDuration: N,
    monthlyInstallmentAmount
  };
};

export const formatCalcNumber = (num) => {
  if (num == null || isNaN(num)) return '';
  const rounded = Math.round(num * 10000) / 10000;
  return String(rounded);
};

export const recalcInvestmentFields = (form, lastEdited) => {
  const P = parseFloat(form.investmentAmount);
  const N = parseInt(form.installmentDuration, 10);
  const updated = { ...form, lastEdited };

  if (!isNaN(P) && P > 0) {
    if (lastEdited === 'percentage') {
      const R = parseFloat(form.interestPercentage);
      if (!isNaN(R)) {
        updated.returnAmount = formatCalcNumber(calcReturnTarget(P, R));
      }
    } else if (lastEdited === 'investment') {
      const R = parseFloat(form.interestPercentage);
      if (!isNaN(R)) {
        updated.returnAmount = formatCalcNumber(calcReturnTarget(P, R));
      }
    } else if (lastEdited === 'returnAmount') {
      const T = parseFloat(form.returnAmount);
      if (!isNaN(T)) {
        updated.interestPercentage = formatCalcNumber(calcInterestPercent(P, T));
      }
    }
  }

  const T = parseFloat(updated.returnAmount);
  if (!isNaN(T) && !isNaN(N) && N > 0) {
    updated.monthlyInstallmentAmount = formatCalcNumber(calcMonthlyInstallment(T, N));
  } else if (lastEdited === 'duration' && isNaN(N)) {
    updated.monthlyInstallmentAmount = '';
  }

  return updated;
};

export const getProjectDurationDisplay = (project, calculations) => {
  const m = calculations || project;
  const settled = m.isSettled ?? (project.status === 'completed' || m.remainingBalance === 0);
  const months = m.durationMonths ?? (settled ? m.activeMonths : m.monthsElapsed);
  return {
    months,
    label: settled ? 'সম্পন্ন' : 'চলমান',
    suffix: settled ? 'মাসে' : 'মাস',
  };
};
