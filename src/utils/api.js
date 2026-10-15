import {
  authService,
  usersService,
  membersService,
  projectsService,
  expensesService,
  reportsService
} from './supabaseService';

/**
 * Parse query string from URL endpoint
 * e.g. "/api/expenses?category=office&month=2026-05" -> { path: "/api/expenses", query: { category: "office", ... } }
 */
const parseEndpoint = (endpoint) => {
  const [path, queryString] = endpoint.split('?');
  const query = {};
  if (queryString) {
    const params = new URLSearchParams(queryString);
    for (const [key, value] of params.entries()) {
      query[key] = value;
    }
  }
  return { path, query };
};

/**
 * Drop-in apiRequest replacement that executes directly against Supabase.
 * Retains 100% signature, input, and output compatibility with existing UI components.
 * 
 * @param {string} endpoint - API route
 * @param {object} options - Options (method, body, headers, etc)
 * @returns {Promise<any>}
 */
export const apiRequest = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
  const { path, query } = parseEndpoint(endpoint);

  try {
    // ---------------- AUTH ----------------
    if (path === '/api/auth/login' && method === 'POST') {
      return await authService.login(body.identifier || body.username || body.mobile || body.phone, body.password);
    }
    if (path === '/api/auth/me' && method === 'GET') {
      return await authService.getMe();
    }

    // ---------------- USERS ----------------
    if (path === '/api/users' && method === 'GET') {
      return await usersService.getAll();
    }
    if (path === '/api/users' && method === 'POST') {
      return await usersService.create(body);
    }
    const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch) {
      const id = userMatch[1];
      if (method === 'PUT') return await usersService.update(id, body);
      if (method === 'DELETE') return await usersService.delete(id);
    }

    // ---------------- MEMBERS ----------------
    if (path === '/api/members' && method === 'GET') {
      return await membersService.getAll();
    }
    if (path === '/api/members' && method === 'POST') {
      return await membersService.create(body);
    }
    const memberDepositMatch = path.match(/^\/api\/members\/([^/]+)\/deposit$/);
    if (memberDepositMatch && method === 'POST') {
      return await membersService.recordDeposit(memberDepositMatch[1], body);
    }
    const memberHistoryMatch = path.match(/^\/api\/members\/([^/]+)\/history$/);
    if (memberHistoryMatch && method === 'GET') {
      return await membersService.getHistory(memberHistoryMatch[1]);
    }
    const deleteDepositMatch = path.match(/^\/api\/members\/deposit\/([^/]+)$/);
    if (deleteDepositMatch && method === 'DELETE') {
      return await membersService.deleteDeposit(deleteDepositMatch[1]);
    }
    const memberMatch = path.match(/^\/api\/members\/([^/]+)$/);
    if (memberMatch) {
      const id = memberMatch[1];
      if (method === 'GET') return await membersService.getById(id);
      if (method === 'PUT') return await membersService.update(id, body);
      if (method === 'DELETE') return await membersService.delete(id);
    }

    // ---------------- PROJECTS ----------------
    if (path === '/api/projects' && method === 'GET') {
      return await projectsService.getAll();
    }
    if (path === '/api/projects' && method === 'POST') {
      return await projectsService.create(body);
    }
    const projectInstallmentMatch = path.match(/^\/api\/projects\/([^/]+)\/installment$/);
    if (projectInstallmentMatch && method === 'POST') {
      return await projectsService.collectInstallment(projectInstallmentMatch[1], body);
    }
    const projectHistoryMatch = path.match(/^\/api\/projects\/([^/]+)\/history$/);
    if (projectHistoryMatch && method === 'GET') {
      return await projectsService.getHistory(projectHistoryMatch[1]);
    }
    const deleteInstallmentMatch = path.match(/^\/api\/projects\/installment\/([^/]+)$/);
    if (deleteInstallmentMatch && method === 'DELETE') {
      return await projectsService.deleteInstallment(deleteInstallmentMatch[1]);
    }
    const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch) {
      const id = projectMatch[1];
      if (method === 'GET') return await projectsService.getById(id);
      if (method === 'PUT') return await projectsService.update(id, body);
      if (method === 'DELETE') return await projectsService.delete(id);
    }

    // ---------------- EXPENSES ----------------
    if (path === '/api/expenses' && method === 'GET') {
      return await expensesService.getAll(query);
    }
    if (path === '/api/expenses' && method === 'POST') {
      return await expensesService.create(body);
    }
    const expenseMatch = path.match(/^\/api\/expenses\/([^/]+)$/);
    if (expenseMatch) {
      const id = expenseMatch[1];
      if (method === 'PUT') return await expensesService.update(id, body);
      if (method === 'DELETE') return await expensesService.delete(id);
    }

    // ---------------- REPORTS ----------------
    if (path === '/api/reports/dashboard' && method === 'GET') {
      return await reportsService.getDashboard();
    }
    if (path === '/api/reports/member-deposits' && method === 'GET') {
      return await reportsService.getMemberDeposits(query);
    }
    if (path === '/api/reports/member-dues' && method === 'GET') {
      return await reportsService.getMemberDues();
    }
    if (path === '/api/reports/project-collections' && method === 'GET') {
      return await reportsService.getProjectCollections(query);
    }
    if (path === '/api/reports/project-dues' && method === 'GET') {
      return await reportsService.getProjectDues();
    }
    if (path === '/api/reports/profits' && method === 'GET') {
      return await reportsService.getProfits();
    }
    if (path === '/api/reports/member-summary' && method === 'GET') {
      return await reportsService.getMemberSummary();
    }

    throw new Error(`অপরিচিত API পাথ বা মেথড: ${method} ${endpoint}`);
  } catch (error) {
    console.error(`[API Router Error] ${method} ${endpoint}:`, error);
    throw error;
  }
};
