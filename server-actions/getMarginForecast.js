const run = async (r, args) => {
  try {
    const installParams = args?.context?.installation?.installationParams || {};
    const HOURLY_RATE = Number(installParams.billableRate) || 150;
    const HOURLY_COST = Number(installParams.costRate) || 100;
    const TARGET_MARGIN = Number(installParams.targetMargin) || 20;

    // Fetch all projects via Rocketlane API using the SDK
    let projects = [];
    let pageToken = null;
    let hasMore = true;

    while (hasMore) {
      const params = { includeAllFields: true, pageSize: 50 };
      if (pageToken) params.pageToken = pageToken;

      const response = await r.api.get("/api/1.0/projects", { params });
      const data = response.data;

      if (data && data.data) {
        projects = projects.concat(data.data);
        hasMore = data.pagination?.hasMore || false;
        pageToken = data.pagination?.nextPageToken || null;
      } else {
        hasMore = false;
      }
    }

    // Compute risk model for each project
    const scored = projects.map((p) => {
      const budget = p.budgetedHours || 0;
      const tracked = p.trackedHours || 0;
      const billable = p.billableHours || 0;
      const progress = p.progressPercentage || 0;
      const fee = p.projectFee || 0;
      const ageDays = p.projectAgeInDays || 0;
      const plannedDays = p.plannedDurationInDays || 1;
      const status = p.status?.label || "Unknown";
      const ct = p.financials?.contractType || "UNKNOWN";
      const allocH = p.allocatedHours || 0;
      const actMargin = p.financials?.metrics?.actualProfitMargin || 0;

      // EAC
      const eac = tracked > 0 && progress > 0 ? (tracked / progress) * 100 : budget;
      const projCost = eac * HOURLY_COST;
      const projRev = ct === "FIXED_FEE" ? fee : ct === "TIME_AND_MATERIAL" ? eac * HOURLY_RATE : 0;
      const fcastMargin = projRev > 0 ? ((projRev - projCost) / projRev) * 100 : 0;
      const burnRate = budget > 0 ? (tracked / budget) * 100 : 0;
      const elapsed = Math.min((ageDays / plannedDays) * 100, 100);
      const velGap = elapsed - progress;
      const overrun = budget > 0 ? ((eac - budget) / budget) * 100 : 0;
      const billR = tracked > 0 ? (billable / tracked) * 100 : 100;
      const allocX = allocH > 0 && budget > 0 ? allocH / budget : 0;

      // Signals
      const signals = [];
      let level = "low";

      if (ct === "NON_BILLABLE") {
        signals.push({ type: "ok", msg: "Non-billable — margin tracking N/A" });
        return { ...p, _risk: { level: "none", signals, eac, fcastMargin, burnRate, velGap, overrun, billR, projRev, projCost } };
      }

      if (allocX > 3) {
        signals.push({ type: "danger", msg: `Allocation ${Math.round(allocH)}h is ${Math.round(allocX)}× budget (${budget}h) — scope explosion` });
        level = "critical";
      }
      if (overrun > 20) {
        signals.push({ type: "danger", msg: `EAC ${Math.round(eac)}h vs budget ${budget}h (+${overrun.toFixed(0)}%) — hours overrun` });
        level = "critical";
      } else if (overrun > 8) {
        signals.push({ type: "warn", msg: `Hour creep ${overrun.toFixed(0)}% above budget trajectory` });
        if (level === "low") level = "medium";
      }
      if (velGap > 25) {
        signals.push({ type: "danger", msg: `Schedule slipping ${velGap.toFixed(0)}% — elapsed vs progress gap` });
        if (level !== "critical") level = "high";
      } else if (velGap > 12) {
        signals.push({ type: "warn", msg: `Velocity slowing: ${velGap.toFixed(0)}% time vs progress gap` });
        if (level === "low") level = "medium";
      }
      if (fcastMargin < TARGET_MARGIN && projRev > 0 && status !== "Completed") {
        signals.push({ type: "danger", msg: `Forecast margin ${fcastMargin.toFixed(1)}% below ${TARGET_MARGIN}% target` });
        if (level !== "critical") level = "high";
      }
      if (billR < 70 && tracked > 10) {
        signals.push({ type: "warn", msg: `Billable ratio ${billR.toFixed(0)}% — non-billable eroding margin` });
        if (level === "low") level = "medium";
      }
      if (status === "In progress" && tracked === 0 && ageDays > 14) {
        signals.push({ type: "warn", msg: `Zero time logged after ${ageDays} days — true burn hidden` });
        if (level === "low") level = "medium";
      }
      if (signals.length === 0) {
        signals.push({ type: "ok", msg: "No margin slip signals — tracking healthy" });
      }

      return {
        projectId: p.projectId,
        projectName: p.projectName,
        status,
        contractType: ct,
        fee,
        budgetedHours: budget,
        trackedHours: tracked,
        billableHours: billable,
        progressPct: progress,
        projectFee: fee,
        ageDays,
        plannedDays,
        customer: p.customer?.companyName || "",
        owner: `${p.owner?.firstName || ""} ${p.owner?.lastName || ""}`.trim(),
        _risk: { level, signals, eac, fcastMargin, burnRate, velGap, overrun, billR, projRev, projCost, allocatedHours: allocH, hourlyRate: HOURLY_RATE, hourlyCost: HOURLY_COST }
      };
    });

    const RANK = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
    scored.sort((a, b) => RANK[b._risk.level] - RANK[a._risk.level] || b.fee - a.fee);

    const atRisk = scored.filter(p => ["critical","high"].includes(p._risk.level)).length;
    const portfolioValue = scored.reduce((s, p) => s + (p.fee || 0), 0);
    const margins = scored.filter(p => p._risk.fcastMargin > 0 && p._risk.fcastMargin < 200 && p._risk.level !== "none");
    const avgMargin = margins.length ? margins.reduce((s, p) => s + p._risk.fcastMargin, 0) / margins.length : 0;

    return {
      success: true,
      summary: { total: scored.length, atRisk, portfolioValue, avgMargin: parseFloat(avgMargin.toFixed(1)), targetMargin: TARGET_MARGIN },
      projects: scored,
    };
  } catch (err) {
    r.logger.log("getMarginForecast error", err);
    return { success: false, error: err.message, projects: [] };
  }
};

module.exports = { run };
