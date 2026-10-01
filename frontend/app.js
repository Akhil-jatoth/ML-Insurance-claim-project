/* ==============================================================================
   INSURAI ENTERPRISE JAVASCRIPT CONTROLLER (SPA FULL-STACK APP)
   ============================================================================== */

let currentStep = 1;
let lastAssessmentResult = null;
let currentBatchData = [];
let claimHistory = [];

let vehicleDamagePhotos = [];
let policeReportDocument = null;

let activeUser = {
  officerId: "ADJ-9418",
  email: "officer.akhil@insurai-claims.com",
  role: "Senior Claims Adjudicator"
};

document.addEventListener("DOMContentLoaded", () => {
  setupDropZone();
  setupPhotoUploaders();
  updatePoliceReportVisibility();
  initClaimHistory();

  // Check if session exists in memory
  const savedUser = sessionStorage.getItem("insurai_user");
  if (savedUser) {
    try {
      activeUser = JSON.parse(savedUser);
      unlockPortal();
    } catch (e) {
      console.error("Session parse error", e);
    }
  }
});

// ==============================================================================
// 1. AUTHENTICATION & LOGIN GATEWAY
// ==============================================================================
function handleUserLogin(e) {
  if (e) e.preventDefault();
  const officerId = document.getElementById("login-officer-id").value.trim() || "ADJ-9418";
  const email = document.getElementById("login-email").value.trim() || "officer.akhil@insurai-claims.com";
  const role = document.getElementById("login-role").value.trim() || "Senior Claims Adjudicator";

  activeUser = { officerId, email, role };
  sessionStorage.setItem("insurai_user", JSON.stringify(activeUser));
  unlockPortal();
}

function handleDemoLogin() {
  activeUser = {
    officerId: "ADJ-9418",
    email: "officer.akhil@insurai-claims.com",
    role: "Senior Claims Adjudicator (Fast-Track Settlement)"
  };
  sessionStorage.setItem("insurai_user", JSON.stringify(activeUser));
  unlockPortal();
}

function unlockPortal() {
  const roleBrief = activeUser.role ? activeUser.role.split(" ")[0] : "Adjudicator";
  document.getElementById("active-user-name").innerText = `${activeUser.officerId} (${roleBrief})`;
  const overlay = document.getElementById("login-overlay");
  const appWrapper = document.getElementById("app-wrapper");

  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 0.4s ease";
  setTimeout(() => {
    overlay.style.display = "none";
    appWrapper.style.display = "block";
    appWrapper.style.opacity = "0";
    setTimeout(() => {
      appWrapper.style.transition = "opacity 0.4s ease";
      appWrapper.style.opacity = "1";
    }, 50);
  }, 400);
}

function handleUserLogout() {
  sessionStorage.removeItem("insurai_user");
  const overlay = document.getElementById("login-overlay");
  const appWrapper = document.getElementById("app-wrapper");

  // Reset login inputs
  document.getElementById("login-officer-id").value = "";
  document.getElementById("login-email").value = "";
  document.getElementById("login-role").value = "";
  document.getElementById("login-password").value = "";

  appWrapper.style.display = "none";
  overlay.style.display = "flex";
  overlay.style.opacity = "1";
}

// ==============================================================================
// 2. NAVIGATION & TAB SWITCHER
// ==============================================================================
function switchMainTab(tabKey) {
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-view").forEach((view) => view.classList.remove("active"));

  if (tabKey === "wizard") {
    document.querySelectorAll(".nav-btn")[0]?.classList.add("active");
    document.getElementById("tab-wizard")?.classList.add("active");
  } else if (tabKey === "batch") {
    document.querySelectorAll(".nav-btn")[1]?.classList.add("active");
    document.getElementById("tab-batch")?.classList.add("active");
  } else if (tabKey === "certificate") {
    document.querySelectorAll(".nav-btn")[2]?.classList.add("active");
    document.getElementById("tab-certificate")?.classList.add("active");
  } else if (tabKey === "history") {
    document.querySelectorAll(".nav-btn")[3]?.classList.add("active");
    document.getElementById("tab-history")?.classList.add("active");
    renderHistoryTable();
  }
}

function viewSettlementCertificate() {
  switchMainTab("certificate");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==============================================================================
// 3. MULTI-STEP WIZARD CONTROLLER
// ==============================================================================
function goToStep(targetStep) {
  if (targetStep < 1 || targetStep > 4) return;
  currentStep = targetStep;

  // Update step panes
  document.querySelectorAll(".wizard-step-pane").forEach((pane, idx) => {
    if (idx + 1 === currentStep) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });

  // Update stepper nodes
  for (let i = 1; i <= 4; i++) {
    const node = document.getElementById(`step-node-${i}`);
    if (node) {
      if (i < currentStep) {
        node.className = "step-indicator completed";
      } else if (i === currentStep) {
        node.className = "step-indicator active";
      } else {
        node.className = "step-indicator";
      }
    }
  }

  // Update stepper connectors
  for (let i = 1; i <= 3; i++) {
    const conn = document.getElementById(`connector-${i}`);
    if (conn) {
      if (i < currentStep) {
        conn.classList.add("filled");
      } else {
        conn.classList.remove("filled");
      }
    }
  }

  window.scrollTo({ top: 80, behavior: "smooth" });
}

function jumpToStep(targetStep) {
  if (targetStep <= currentStep || (lastAssessmentResult && targetStep <= 4)) {
    goToStep(targetStep);
  }
}

function resetWizardForm() {
  currentStep = 1;
  lastAssessmentResult = null;
  
  // Clear uploaded evidence photos
  vehicleDamagePhotos = [];
  policeReportDocument = null;
  renderDamagePhotosPreview();
  renderPoliceReportPreview();
  updatePoliceReportVisibility();

  // Set all values to empty null or 0 with placeholders showing
  const emptyFields = [
    "customer_age", "months_as_customer", "insured_sex", "insured_education_level",
    "insured_occupation", "policy_state", "auto_make", "auto_year", "claim_amount",
    "policy_annual_premium", "policy_deductable", "property_damage", "incident_type",
    "incident_severity", "collision_type", "authorities_contacted", "police_report_available"
  ];
  emptyFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const zeroFields = ["previous_claims", "witnesses", "bodily_injuries"];
  zeroFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "0";
  });

  goToStep(1);
}

// ==============================================================================
// 4. SCENARIO PRESET LOADER
// ==============================================================================
function loadPreset(presetKey) {
  const presets = {
    minor: {
      customer_age: 42,
      months_as_customer: 84,
      previous_claims: 0,
      insured_sex: "MALE",
      insured_education_level: "College",
      insured_occupation: "Manager",
      policy_state: "OH",
      auto_make: "Toyota",
      auto_year: 2021,
      claim_amount: 2800,
      policy_annual_premium: 1100,
      policy_deductable: "500",
      property_damage: "NO",
      incident_type: "Parked Car",
      incident_severity: "Minor",
      collision_type: "Side",
      authorities_contacted: "Police",
      witnesses: 2,
      police_report_available: "YES",
      bodily_injuries: 0
    },
    highway: {
      customer_age: 36,
      months_as_customer: 48,
      previous_claims: 1,
      insured_sex: "FEMALE",
      insured_education_level: "College",
      insured_occupation: "Engineer",
      policy_state: "CA",
      auto_make: "Honda",
      auto_year: 2018,
      claim_amount: 34000,
      policy_annual_premium: 1350,
      policy_deductable: "1000",
      property_damage: "YES",
      incident_type: "Multi Vehicle",
      incident_severity: "Major",
      collision_type: "Rear",
      authorities_contacted: "Police",
      witnesses: 1,
      police_report_available: "YES",
      bodily_injuries: 1
    },
    theft: {
      customer_age: 25,
      months_as_customer: 12,
      previous_claims: 3,
      insured_sex: "MALE",
      insured_education_level: "High School",
      insured_occupation: "Sales",
      policy_state: "TX",
      auto_make: "Mercedes",
      auto_year: 2023,
      claim_amount: 118000,
      policy_annual_premium: 2400,
      policy_deductable: "2000",
      property_damage: "NO",
      incident_type: "Vehicle Theft",
      incident_severity: "Total Loss",
      collision_type: "Unknown",
      authorities_contacted: "None",
      witnesses: 0,
      police_report_available: "NO",
      bodily_injuries: 0
    },
    staged: {
      customer_age: 29,
      months_as_customer: 6,
      previous_claims: 4,
      insured_sex: "MALE",
      insured_education_level: "Associate",
      insured_occupation: "Manager",
      policy_state: "NY",
      auto_make: "BMW",
      auto_year: 2024,
      claim_amount: 145000,
      policy_annual_premium: 3100,
      policy_deductable: "2000",
      property_damage: "YES",
      incident_type: "Single Vehicle",
      incident_severity: "Total Loss",
      collision_type: "Front",
      authorities_contacted: "None",
      witnesses: 0,
      police_report_available: "NO",
      bodily_injuries: 0
    }
  };

  const data = presets[presetKey];
  if (!data) return;
  
  for (const [key, val] of Object.entries(data)) {
    const el = document.getElementById(key);
    if (el) {
      el.value = val;
    }
  }
  updatePoliceReportVisibility();
}

// ==============================================================================
// 5. API CLAIM ASSESSMENT EXECUTION
// ==============================================================================
async function executeClaimAssessment() {
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    if (!el || el.value === undefined || el.value.trim() === "") return fallback;
    return el.value.trim();
  };

  const getNum = (id, fallback) => {
    const el = document.getElementById(id);
    if (!el || el.value === undefined || el.value.trim() === "") return fallback;
    const n = parseFloat(el.value);
    return isNaN(n) ? fallback : n;
  };

  const payload = {
    customer_age: getNum("customer_age", 38),
    months_as_customer: getNum("months_as_customer", 60),
    previous_claims: getNum("previous_claims", 0),
    insured_sex: getVal("insured_sex", "MALE"),
    insured_education_level: getVal("insured_education_level", "College"),
    insured_occupation: getVal("insured_occupation", "Manager"),
    policy_state: getVal("policy_state", "OH"),
    auto_make: getVal("auto_make", "BMW"),
    auto_year: getNum("auto_year", 2020),
    claim_amount: getNum("claim_amount", 45000),
    policy_annual_premium: getNum("policy_annual_premium", 1250),
    policy_deductable: getNum("policy_deductable", 1000),
    property_damage: getVal("property_damage", "YES"),
    incident_type: getVal("incident_type", "Single Vehicle"),
    incident_severity: getVal("incident_severity", "Major"),
    collision_type: getVal("collision_type", "Front"),
    authorities_contacted: getVal("authorities_contacted", "Police"),
    witnesses: getNum("witnesses", 0),
    police_report_available: getVal("police_report_available", "YES"),
    bodily_injuries: getNum("bodily_injuries", 0)
  };

  try {
    const resp = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) throw new Error("API request failed");
    const json = await resp.json();
    lastAssessmentResult = json;
    
    // Generate unique Claim Reference
    const randomClaimId = `CLM-${Math.floor(100000 + Math.random() * 900000)}`;
    json.claim_id = randomClaimId;

    renderVerdict(json.assessment, payload, randomClaimId);
    saveClaimToHistory(json.assessment, payload, randomClaimId);
    goToStep(4);
  } catch (err) {
    console.error("Assessment Error:", err);
    alert("Error communicating with AI engine. Please ensure the server is running.");
  }
}

function renderVerdict(assessment, payload, claimId) {
  const currentClaimId = claimId || lastAssessmentResult?.claim_id || `CLM-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Score & Radial Gauge
  const scorePct = (assessment.composite_prob * 100).toFixed(1);
  document.getElementById("verdict-score").innerText = `${scorePct}%`;
  
  const gaugeFill = document.getElementById("gauge-fill");
  const circumference = 314; // 2 * PI * 50
  const offset = circumference - (assessment.composite_prob * circumference);
  gaugeFill.style.strokeDashoffset = offset;
  gaugeFill.style.stroke = assessment.risk_color;

  // Badge
  const badgeEl = document.getElementById("verdict-tier-badge");
  badgeEl.className = `badge-pill ${assessment.badge_style}`;
  badgeEl.innerText = assessment.risk_category;

  // 2. Directive Card
  document.getElementById("verdict-routing-title").innerText = assessment.routing_title;
  document.getElementById("verdict-summary").innerText = assessment.action_summary;
  document.getElementById("verdict-action-code").innerText = assessment.action_code;
  document.getElementById("verdict-sla").innerText = assessment.sla;

  // 3. Escrow & Financials Card
  document.getElementById("verdict-escrow-status").innerText = assessment.escrow_status;
  document.getElementById("verdict-claim-amt").innerText = `$${payload.claim_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById("verdict-deductible").innerText = `$${payload.policy_deductable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const netLiability = Math.max(0, payload.claim_amount - payload.policy_deductable);
  document.getElementById("verdict-net-liability").innerText = `$${netLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById("verdict-pol-rep").innerText = payload.police_report_available;

  // 4. Multi-Model Telemetry Bars
  document.getElementById("teacher-prob-val").innerText = `${(assessment.teacher_prob * 100).toFixed(1)}% (${assessment.teacher_time.toFixed(1)}ms)`;
  document.getElementById("teacher-fill-bar").style.width = `${assessment.teacher_prob * 100}%`;

  document.getElementById("student-prob-val").innerText = `${(assessment.student_prob * 100).toFixed(1)}% (${assessment.student_time.toFixed(1)}ms)`;
  document.getElementById("student-fill-bar").style.width = `${assessment.student_prob * 100}%`;

  document.getElementById("consensus-prob-val").innerText = `${scorePct}% (Calibrated)`;
  document.getElementById("consensus-fill-bar").style.width = `${scorePct}%`;
  document.getElementById("consensus-fill-bar").style.backgroundColor = assessment.risk_color;

  // 5. Feature Impacts
  const impactsContainer = document.getElementById("feature-impacts-list");
  impactsContainer.innerHTML = "";
  if (assessment.feature_impacts && assessment.feature_impacts.length > 0) {
    assessment.feature_impacts.forEach((imp) => {
      const isPos = imp.impact > 0;
      const row = document.createElement("div");
      row.className = "impact-item";
      row.innerHTML = `
        <span>${imp.name}</span>
        <span class="impact-val ${isPos ? 'pos' : 'neg'}">${isPos ? '+' : ''}${imp.impact}%</span>
      `;
      impactsContainer.appendChild(row);
    });
  }

  // 6. Forensic Risk Factors
  const factorsContainer = document.getElementById("risk-factors-container");
  factorsContainer.innerHTML = "";
  assessment.risk_factors.forEach((f) => {
    const card = document.createElement("div");
    card.className = `factor-item ${f.tag}`;
    card.innerHTML = `
      <div class="factor-item-title">${f.title}</div>
      <div class="factor-item-desc">${f.desc}</div>
    `;
    factorsContainer.appendChild(card);
  });

  // 7. Update Official Settlement Certificate Fields
  const secHash = `SEC-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  if (document.getElementById("cert-claim-id")) document.getElementById("cert-claim-id").innerText = currentClaimId;
  if (document.getElementById("cert-policyholder-age")) document.getElementById("cert-policyholder-age").innerText = `${payload.customer_age} Years (${payload.insured_sex})`;
  if (document.getElementById("cert-tenure")) document.getElementById("cert-tenure").innerText = `${payload.months_as_customer} Months`;
  if (document.getElementById("cert-state")) document.getElementById("cert-state").innerText = `${payload.policy_state}`;
  if (document.getElementById("cert-vehicle")) document.getElementById("cert-vehicle").innerText = `${payload.auto_make} (${payload.auto_year})`;
  if (document.getElementById("cert-incident")) document.getElementById("cert-incident").innerText = `${payload.incident_type} (${payload.incident_severity})`;
  if (document.getElementById("cert-collision")) document.getElementById("cert-collision").innerText = `${payload.collision_type}`;
  if (document.getElementById("cert-police")) document.getElementById("cert-police").innerText = (String(payload.police_report_available).toUpperCase().includes("YES") || payload.police_report_available === "1") ? "YES (Verified)" : "NO (Unverified)";
  if (document.getElementById("cert-amount")) document.getElementById("cert-amount").innerText = `$${payload.claim_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (document.getElementById("cert-deductible")) document.getElementById("cert-deductible").innerText = `$${payload.policy_deductable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (document.getElementById("cert-liability")) document.getElementById("cert-liability").innerText = `$${netLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (document.getElementById("cert-prior-claims")) document.getElementById("cert-prior-claims").innerText = `${payload.previous_claims}`;
  if (document.getElementById("cert-score-display")) document.getElementById("cert-score-display").innerText = `${scorePct}%`;
  if (document.getElementById("cert-tier-name")) document.getElementById("cert-tier-name").innerText = assessment.risk_category.toUpperCase();
  if (document.getElementById("cert-routing-name")) document.getElementById("cert-routing-name").innerText = assessment.routing_title;
  if (document.getElementById("cert-action-directive")) document.getElementById("cert-action-directive").innerText = assessment.action_summary;
  if (document.getElementById("cert-officer-signature")) document.getElementById("cert-officer-signature").innerText = `${activeUser.officerId || 'ADJ-9418'} • Digitally Enforced`;
  if (document.getElementById("cert-security-hash")) document.getElementById("cert-security-hash").innerText = secHash;

  // Set Certificate Badge Border Color
  const banner = document.getElementById("cert-verdict-banner");
  if (banner) {
    if (assessment.composite_prob > 0.68) {
      banner.style.borderLeft = "4px solid #ef4444";
      banner.style.background = "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)";
    } else if (assessment.composite_prob > 0.32) {
      banner.style.borderLeft = "4px solid #f59e0b";
      banner.style.background = "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)";
    } else {
      banner.style.borderLeft = "4px solid #10b981";
      banner.style.background = "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)";
    }
  }
}

function downloadJSONDossier() {
  if (!lastAssessmentResult) return;
  const str = JSON.stringify(lastAssessmentResult, null, 2);
  const blob = new Blob([str], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `InsurAI_Adjudication_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==============================================================================
// 6. BATCH PROCESSOR CONTROLLER
// ==============================================================================
async function runBatchSimulation() {
  const size = parseInt(document.getElementById("batch-size-slider").value) || 20;
  try {
    const resp = await fetch(`/api/batch-simulation?size=${size}`, { method: "POST" });
    if (!resp.ok) throw new Error("Batch API failed");
    const json = await resp.json();
    currentBatchData = json.claims;
    renderBatchResults(json);
  } catch (err) {
    console.error("Batch Error:", err);
    alert("Batch assessment failed. Please try again.");
  }
}

function renderBatchResults(data) {
  // Update KPIs
  document.getElementById("kpi-tot-exp").innerText = `$${data.kpi.total_exposure.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById("kpi-fraud-escrow").innerText = `$${data.kpi.fraud_escrow.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  document.getElementById("kpi-fast-track").innerText = `${data.kpi.fast_track_count} / ${data.total_claims} (${Math.round(data.kpi.fast_track_count / data.total_claims * 100)}%)`;
  document.getElementById("kpi-fraud-flags").innerText = `${data.kpi.fraud_count} Claims`;

  // Render Table
  const tbody = document.getElementById("batch-table-body");
  tbody.innerHTML = "";

  data.claims.forEach((row) => {
    const tr = document.createElement("tr");
    const isHigh = row.raw_score > 0.68;
    const isMid = row.raw_score > 0.32 && row.raw_score <= 0.68;
    const badgeClass = isHigh ? "badge-high-risk" : (isMid ? "badge-mid-risk" : "badge-low-risk");

    tr.innerHTML = `
      <td><b>${row.claim_id}</b></td>
      <td>$${row.claim_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td>${row.vehicle}</td>
      <td>${row.incident}</td>
      <td>${row.police_report}</td>
      <td><span class="badge-pill ${badgeClass}">${row.risk_score_pct}%</span></td>
      <td><b>${row.routing_title}</b></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("btn-download-batch").disabled = false;
}

function downloadBatchCSV() {
  if (!currentBatchData || currentBatchData.length === 0) return;
  
  const headers = ["Claim ID", "Claim Amount", "Vehicle", "Incident", "Police Report", "Witnesses", "Risk Score (%)", "Risk Tier", "Routing Decision", "Escrow Status"];
  const rows = currentBatchData.map(c => [
    c.claim_id, c.claim_amount, `"${c.vehicle}"`, `"${c.incident}"`, c.police_report, c.witnesses, c.risk_score_pct, `"${c.risk_category}"`, `"${c.routing_title}"`, `"${c.escrow_status}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `InsurAI_Adjudicated_Batch_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Drag & Drop CSV Uploader
function setupDropZone() {
  const dropZone = document.getElementById("csv-drop-zone");
  const fileInput = document.getElementById("csv-file-input");

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      processUploadedCSV(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      processUploadedCSV(e.target.files[0]);
    }
  });
}

// Setup Vehicle Damage Photos (2-3 Photos) and Police Report Uploaders
function setupPhotoUploaders() {
  // 1. Vehicle Damage Photos Uploader
  const damageDropZone = document.getElementById("damage-photos-drop-zone");
  const damageFileInput = document.getElementById("vehicle_damage_photos");

  if (damageDropZone && damageFileInput) {
    damageDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      damageDropZone.classList.add("dragover");
    });

    damageDropZone.addEventListener("dragleave", () => {
      damageDropZone.classList.remove("dragover");
    });

    damageDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      damageDropZone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleDamagePhotosAdded(Array.from(e.dataTransfer.files));
      }
    });

    damageFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleDamagePhotosAdded(Array.from(e.target.files));
        damageFileInput.value = "";
      }
    });
  }

  // 2. Police Report Photo / Document Uploader
  const policeDropZone = document.getElementById("police-report-drop-zone");
  const policeFileInput = document.getElementById("police_report_photo");

  if (policeDropZone && policeFileInput) {
    policeDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      policeDropZone.classList.add("dragover");
    });

    policeDropZone.addEventListener("dragleave", () => {
      policeDropZone.classList.remove("dragover");
    });

    policeDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      policeDropZone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handlePoliceReportAdded(e.dataTransfer.files[0]);
      }
    });

    policeFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePoliceReportAdded(e.target.files[0]);
        policeFileInput.value = "";
      }
    });
  }

  // 3. Conditional Visibility for Police Report Upload on police_report_available input
  const polInput = document.getElementById("police_report_available");
  if (polInput) {
    ["input", "change", "keyup", "blur"].forEach(evt => {
      polInput.addEventListener(evt, updatePoliceReportVisibility);
    });
  }
}

function updatePoliceReportVisibility() {
  const polInput = document.getElementById("police_report_available");
  const policeContainer = document.getElementById("police-report-upload-container");
  if (!polInput || !policeContainer) return;

  const val = (polInput.value || "").trim().toUpperCase();
  const isYes = val === "YES" || val.includes("YES") || val.startsWith("Y") || val === "1" || val === "TRUE";

  if (isYes) {
    policeContainer.style.setProperty("display", "flex", "important");
  } else {
    policeContainer.style.setProperty("display", "none", "important");
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function handleDamagePhotosAdded(files) {
  const validFiles = files.filter(f => f.type.startsWith("image/"));
  if (validFiles.length === 0) {
    alert("Please select valid image files (JPG, PNG, WebP).");
    return;
  }

  const remainingSlots = 3 - vehicleDamagePhotos.length;
  if (remainingSlots <= 0) {
    alert("Maximum of 3 vehicle damage photos can be attached. Please remove an existing photo to upload a new one.");
    return;
  }

  const filesToAdd = validFiles.slice(0, remainingSlots);
  if (validFiles.length > remainingSlots) {
    alert(`Only ${remainingSlots} more photo(s) could be added. Maximum 3 photos allowed.`);
  }

  filesToAdd.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      vehicleDamagePhotos.push({
        file: file,
        dataUrl: e.target.result,
        name: file.name,
        size: file.size
      });
      renderDamagePhotosPreview();
    };
    reader.readAsDataURL(file);
  });
}

function removeDamagePhoto(index) {
  vehicleDamagePhotos.splice(index, 1);
  renderDamagePhotosPreview();
}

function renderDamagePhotosPreview() {
  const container = document.getElementById("damage-photos-preview-grid");
  const labelText = document.getElementById("damage-photos-label-text");
  const counter = document.getElementById("damage-photos-counter");
  if (!container) return;

  const count = vehicleDamagePhotos.length;

  // Update input placeholder / text
  if (labelText) {
    if (count === 0) {
      labelText.innerHTML = `<i class="fa-solid fa-camera"></i> <span class="placeholder-text">Choose 2 to 3 photos (or drag &amp; drop)...</span>`;
    } else {
      labelText.innerHTML = `<i class="fa-solid fa-camera" style="color: #38bdf8;"></i> <span style="color: #f8fafc; font-weight: 600;">${count} vehicle photo${count > 1 ? 's' : ''} attached</span>`;
    }
  }

  // Update badge counter if present
  if (counter) {
    counter.innerText = `${count}/3`;
    counter.style.display = count > 0 ? "inline" : "none";
  }

  // Render compact chips
  container.innerHTML = vehicleDamagePhotos.map((photo, idx) => `
    <div class="file-chip">
      <img src="${photo.dataUrl}" alt="Photo ${idx + 1}" class="file-chip-thumb" />
      <span class="file-chip-name" title="${photo.name}">${photo.name}</span>
      <span class="file-chip-size">${formatFileSize(photo.size)}</span>
      <button type="button" class="file-chip-remove" title="Remove photo" onclick="event.stopPropagation(); removeDamagePhoto(${idx});">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join("");
}

function handlePoliceReportAdded(file) {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isImage && !isPdf) {
    alert("Please upload a valid image (JPG, PNG, WebP) or PDF file for the police report.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    policeReportDocument = {
      file: file,
      dataUrl: e.target.result,
      isPdf: isPdf,
      name: file.name,
      size: file.size
    };
    renderPoliceReportPreview();
  };
  reader.readAsDataURL(file);
}

function removePoliceReport() {
  policeReportDocument = null;
  renderPoliceReportPreview();
}

function renderPoliceReportPreview() {
  const container = document.getElementById("police-report-preview-grid");
  const labelText = document.getElementById("police-report-label-text");
  const statusBadge = document.getElementById("police-report-status");
  if (!container) return;

  if (!policeReportDocument) {
    container.innerHTML = "";
    if (labelText) {
      labelText.innerHTML = `<i class="fa-solid fa-file-shield"></i> <span class="placeholder-text">Select police report photo or PDF...</span>`;
    }
    if (statusBadge) {
      statusBadge.style.display = "none";
    }
    return;
  }

  if (labelText) {
    labelText.innerHTML = `<i class="fa-solid fa-file-shield" style="color: #c084fc;"></i> <span style="color: #f8fafc; font-weight: 600;">${policeReportDocument.name}</span>`;
  }

  if (statusBadge) {
    statusBadge.style.display = "inline";
    statusBadge.innerText = "Attached";
  }

  container.innerHTML = `
    <div class="file-chip">
      ${policeReportDocument.isPdf ? `
        <i class="fa-solid fa-file-pdf file-chip-doc-icon"></i>
      ` : `
        <img src="${policeReportDocument.dataUrl}" alt="Police Report" class="file-chip-thumb" />
      `}
      <span class="file-chip-name" title="${policeReportDocument.name}">${policeReportDocument.name}</span>
      <span class="file-chip-size">${formatFileSize(policeReportDocument.size)}</span>
      <button type="button" class="file-chip-remove" title="Remove report" onclick="event.stopPropagation(); removePoliceReport();">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `;
}

function processUploadedCSV(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    const lines = text.split("\n").filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      alert("Invalid CSV: Must have header and data rows.");
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < Math.min(lines.length, 51); i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || "";
      });
      rows.push(obj);
    }

    const batchResults = [];
    for (const r of rows) {
      try {
        const payload = {
          claim_amount: parseFloat(r.claim_amount) || 45000,
          customer_age: parseInt(r.customer_age) || 35,
          auto_make: r.auto_make || "BMW",
          auto_year: parseInt(r.auto_year) || 2020,
          incident_type: r.incident_type || "Single Vehicle",
          incident_severity: r.incident_severity || "Major",
          police_report_available: r.police_report_available || "YES",
          witnesses: parseInt(r.witnesses) || 0,
          previous_claims: parseInt(r.previous_claims) || 0
        };
        const resp = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const resJson = await resp.json();
        const a = resJson.assessment;
        batchResults.push({
          claim_id: r.claim_id || `CLM-${Math.floor(100000 + Math.random() * 900000)}`,
          claim_amount: payload.claim_amount,
          vehicle: `${payload.auto_make} (${payload.auto_year})`,
          incident: `${payload.incident_type} (${payload.incident_severity})`,
          police_report: payload.police_report_available,
          witnesses: payload.witnesses,
          risk_score_pct: (a.composite_prob * 100).toFixed(1),
          risk_category: a.risk_category,
          routing_title: a.routing_title,
          escrow_status: a.escrow_status,
          raw_score: a.composite_prob
        });
      } catch (err) {
        console.error(err);
      }
    }

    currentBatchData = batchResults;
    const totalExposure = batchResults.reduce((acc, c) => acc + c.claim_amount, 0);
    const fraudEscrow = batchResults.filter(c => c.raw_score > 0.68).reduce((acc, c) => acc + c.claim_amount, 0);
    const fastTrackCount = batchResults.filter(c => c.raw_score <= 0.32).length;
    const fraudCount = batchResults.filter(c => c.raw_score > 0.68).length;

    renderBatchResults({
      total_claims: batchResults.length,
      kpi: {
        total_exposure: totalExposure,
        fraud_escrow: fraudEscrow,
        fast_track_count: fastTrackCount,
        fraud_count: fraudCount
      },
      claims: batchResults
    });
  };
  reader.readAsText(file);
}

// ==============================================================================
// 7. CLAIM AUDIT HISTORY ENGINE
// ==============================================================================
function initClaimHistory() {
  const savedHistory = localStorage.getItem("insurai_claim_history");
  if (savedHistory) {
    try {
      claimHistory = JSON.parse(savedHistory);
    } catch (e) {
      claimHistory = [];
    }
  }

  // Seed sample initial history items if completely empty
  if (!claimHistory || claimHistory.length === 0) {
    claimHistory = [
      {
        id: "CLM-914028",
        timestamp: new Date(Date.now() - 3600000 * 4).toLocaleString(),
        officer: "ADJ-9418",
        payload: {
          customer_age: 42,
          months_as_customer: 84,
          previous_claims: 0,
          insured_sex: "MALE",
          insured_education_level: "College",
          insured_occupation: "Manager",
          policy_state: "OH",
          auto_make: "Toyota",
          auto_year: 2021,
          claim_amount: 2800,
          policy_annual_premium: 1100,
          policy_deductable: 500,
          property_damage: "NO",
          incident_type: "Parked Car",
          incident_severity: "Minor",
          collision_type: "Side",
          authorities_contacted: "Police",
          witnesses: 2,
          police_report_available: "YES",
          bodily_injuries: 0
        },
        assessment: {
          composite_prob: 0.125,
          teacher_prob: 0.14,
          student_prob: 0.11,
          teacher_time: 1.8,
          student_time: 0.6,
          risk_category: "Low Risk Profile",
          routing_title: "Fast-Track Auto Settlement",
          action_code: "ACT-FT-200",
          action_summary: "Claim passes automated screening. Cleared for instant electronic ACH disbursement.",
          sla: "< 24 Hours",
          escrow_status: "Approved & Escrow Released",
          badge_style: "badge-low-risk",
          risk_color: "#10b981",
          feature_impacts: [
            { name: "Minor Damage Rating", impact: -18.4 },
            { name: "Verified Police Report", impact: -12.6 },
            { name: "Zero Loss History", impact: -9.1 }
          ],
          risk_factors: [
            { tag: "tag-low", title: "Clean Record Verification", desc: "No prior suspicious claims found in historical registry." }
          ]
        }
      },
      {
        id: "CLM-882310",
        timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString(),
        officer: "ADJ-9418",
        payload: {
          customer_age: 29,
          months_as_customer: 6,
          previous_claims: 4,
          insured_sex: "MALE",
          insured_education_level: "Associate",
          insured_occupation: "Manager",
          policy_state: "NY",
          auto_make: "BMW",
          auto_year: 2024,
          claim_amount: 145000,
          policy_annual_premium: 3100,
          policy_deductable: 2000,
          property_damage: "YES",
          incident_type: "Single Vehicle",
          incident_severity: "Total Loss",
          collision_type: "Front",
          authorities_contacted: "None",
          witnesses: 0,
          police_report_available: "NO",
          bodily_injuries: 0
        },
        assessment: {
          composite_prob: 0.892,
          teacher_prob: 0.91,
          student_prob: 0.874,
          teacher_time: 1.9,
          student_time: 0.5,
          risk_category: "High Risk (Critical)",
          routing_title: "SIU Forensic Fraud Referral",
          action_code: "ACT-SIU-900",
          action_summary: "Severe anomaly profile detected. Claim flagged for immediate forensic inspection & escrow freeze.",
          sla: "Immediate Freeze (7-14 Day Audit)",
          escrow_status: "FROZEN — Pending Special Investigation",
          badge_style: "badge-high-risk",
          risk_color: "#ef4444",
          feature_impacts: [
            { name: "Unverified Total Loss", impact: 34.2 },
            { name: "Missing Police Report", impact: 22.8 },
            { name: "New Policy & High Exposure", impact: 19.5 }
          ],
          risk_factors: [
            { tag: "tag-critical", title: "Forensic SIU Alert", desc: "Critical multi-feature anomaly signature matched." }
          ]
        }
      }
    ];
    localStorage.setItem("insurai_claim_history", JSON.stringify(claimHistory));
  }
}

function saveClaimToHistory(assessment, payload, claimId) {
  const record = {
    id: claimId,
    timestamp: new Date().toLocaleString(),
    officer: activeUser.officerId || "ADJ-9418",
    payload: { ...payload },
    assessment: { ...assessment }
  };

  claimHistory.unshift(record);
  if (claimHistory.length > 200) claimHistory.pop(); // Keep top 200
  localStorage.setItem("insurai_claim_history", JSON.stringify(claimHistory));
  renderHistoryTable();
}

function renderHistoryTable(recordsToRender) {
  const data = recordsToRender || claimHistory;
  const tbody = document.getElementById("history-table-body");
  if (!tbody) return;

  // Update Summary KPIs
  const totalCount = claimHistory.length;
  const lowCount = claimHistory.filter(c => c.assessment.composite_prob <= 0.32).length;
  const highCount = claimHistory.filter(c => c.assessment.composite_prob > 0.68).length;
  const totalExp = claimHistory.reduce((acc, c) => acc + (c.payload.claim_amount || 0), 0);

  if (document.getElementById("hist-kpi-total")) document.getElementById("hist-kpi-total").innerText = `${totalCount} Claims`;
  if (document.getElementById("hist-kpi-low")) document.getElementById("hist-kpi-low").innerText = `${lowCount} Claims (${totalCount ? Math.round(lowCount/totalCount*100) : 0}%)`;
  if (document.getElementById("hist-kpi-high")) document.getElementById("hist-kpi-high").innerText = `${highCount} Claims`;
  if (document.getElementById("hist-kpi-exposure")) document.getElementById("hist-kpi-exposure").innerText = `$${totalExp.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center empty-msg">No matching claim audit records found.</td></tr>`;
    return;
  }

  data.forEach((item, index) => {
    const tr = document.createElement("tr");
    const isHigh = item.assessment.composite_prob > 0.68;
    const isMid = item.assessment.composite_prob > 0.32 && item.assessment.composite_prob <= 0.68;
    const badgeClass = isHigh ? "badge-high-risk" : (isMid ? "badge-mid-risk" : "badge-low-risk");
    const scorePct = (item.assessment.composite_prob * 100).toFixed(1);

    tr.innerHTML = `
      <td><small style="color: var(--text-muted);">${item.timestamp}</small></td>
      <td><b>${item.id}</b></td>
      <td><span class="user-chip-sm" style="font-size:0.75rem; color:var(--accent-cyan);"><i class="fa-solid fa-id-badge"></i> ${item.officer}</span></td>
      <td>${item.payload.auto_make} (${item.payload.auto_year}) • Age ${item.payload.customer_age}</td>
      <td>$${item.payload.claim_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td><span class="badge-pill ${badgeClass}">${scorePct}%</span></td>
      <td><b>${item.assessment.routing_title}</b></td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn-action-icon" title="Inspect / Reload in Wizard" onclick="inspectHistoricalClaim('${item.id}')">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </button>
        <button class="btn-action-icon" title="View Settlement Certificate" onclick="certifyHistoricalClaim('${item.id}')">
          <i class="fa-solid fa-stamp"></i>
        </button>
        <button class="btn-action-icon btn-danger" title="Delete record" onclick="deleteHistoricalClaim('${item.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterHistoryTable() {
  const search = (document.getElementById("history-search-input")?.value || "").toLowerCase().trim();
  const tier = document.getElementById("history-filter-tier")?.value || "ALL";

  const filtered = claimHistory.filter(item => {
    const matchSearch = !search || 
      item.id.toLowerCase().includes(search) ||
      item.officer.toLowerCase().includes(search) ||
      (item.payload.auto_make || "").toLowerCase().includes(search) ||
      (item.payload.incident_type || "").toLowerCase().includes(search);

    let matchTier = true;
    if (tier === "LOW") matchTier = item.assessment.composite_prob <= 0.32;
    else if (tier === "MED") matchTier = item.assessment.composite_prob > 0.32 && item.assessment.composite_prob <= 0.68;
    else if (tier === "HIGH") matchTier = item.assessment.composite_prob > 0.68;

    return matchSearch && matchTier;
  });

  renderHistoryTable(filtered);
}

function inspectHistoricalClaim(claimId) {
  const record = claimHistory.find(c => c.id === claimId);
  if (!record) return;

  // Load payload into input fields
  for (const [key, val] of Object.entries(record.payload)) {
    const el = document.getElementById(key);
    if (el) el.value = val;
  }

  lastAssessmentResult = { assessment: record.assessment, claim_id: record.id };
  renderVerdict(record.assessment, record.payload, record.id);
  switchMainTab("wizard");
  goToStep(4);
}

function certifyHistoricalClaim(claimId) {
  const record = claimHistory.find(c => c.id === claimId);
  if (!record) return;

  renderVerdict(record.assessment, record.payload, record.id);
  switchMainTab("certificate");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteHistoricalClaim(claimId) {
  claimHistory = claimHistory.filter(c => c.id !== claimId);
  localStorage.setItem("insurai_claim_history", JSON.stringify(claimHistory));
  filterHistoryTable();
}

function clearClaimHistory() {
  if (confirm("Are you sure you want to clear all historical claim records?")) {
    claimHistory = [];
    localStorage.removeItem("insurai_claim_history");
    renderHistoryTable();
  }
}

function exportHistoryCSV() {
  if (!claimHistory || claimHistory.length === 0) {
    alert("No claim records to export.");
    return;
  }

  const headers = ["Claim ID", "Timestamp", "Officer", "Age", "State", "Vehicle", "Year", "Exposure ($)", "Deductible ($)", "Incident", "Severity", "Police Report", "Risk Score (%)", "Risk Tier", "Routing Action"];
  const rows = claimHistory.map(c => [
    c.id, `"${c.timestamp}"`, `"${c.officer}"`, c.payload.customer_age, c.payload.policy_state, `"${c.payload.auto_make}"`, c.payload.auto_year, c.payload.claim_amount, c.payload.policy_deductable, `"${c.payload.incident_type}"`, `"${c.payload.incident_severity}"`, c.payload.police_report_available, (c.assessment.composite_prob * 100).toFixed(1), `"${c.assessment.risk_category}"`, `"${c.assessment.routing_title}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `InsurAI_Audit_History_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
