/**
 * Member calculation helpers mirroring backend/routes/members.js
 * Billing cutoff is PREVIOUS month: members pay current month's dues in the next month
 * e.g. In June, they pay May's dues -> June is NOT yet billable
 */

export const calculateMonthsElapsed = (joiningDate) => {
  if (!joiningDate) return 0;
  const start = new Date(joiningDate);
  const now = new Date();
  
  const startYear = start.getFullYear();
  const startMonth = start.getMonth();

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();

  let endYear = nowYear;
  let endMonth = nowMonth - 1;
  if (endMonth < 0) {
    endMonth = 11;
    endYear -= 1;
  }

  if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
    return 0;
  }

  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
};

/**
 * Generate list of months from start date to previous month (billing cutoff)
 * @param {string|Date} startDate 
 * @returns {string[]} Array of "YYYY-MM" strings
 */
export const generateMonthList = (startDate) => {
  if (!startDate) return [];
  const start = new Date(startDate);
  const now = new Date();
  const list = [];

  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const billingEnd = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  while (current <= billingEnd) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    list.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  return list;
};

/**
 * Calculate financial totals and due amount for a single member
 */
export const calculateMemberMetrics = (member, deposits = []) => {
  const memberDeposits = deposits.filter(
    (dep) => String(dep.member_id || dep.member?._id || dep.member) === String(member.id || member._id)
  );
  const totalDeposited = memberDeposits.reduce((sum, dep) => sum + Number(dep.amount || 0), 0);
  const monthsElapsed = calculateMonthsElapsed(member.joining_date || member.joiningDate);
  const expectedDeposits = monthsElapsed * Number(member.monthly_deposit_amount || member.monthlyDepositAmount || 0);
  const totalDue = Math.max(0, expectedDeposits - totalDeposited);
  const currentBalance = totalDeposited;

  return {
    totalDeposited,
    expectedDeposits,
    totalDue,
    currentBalance,
    monthsElapsed
  };
};
