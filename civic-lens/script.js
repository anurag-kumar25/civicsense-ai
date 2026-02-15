document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('complaintForm');
    const imageInput = document.getElementById('image');
    const fileNameDisplay = document.getElementById('fileName');
    const successMessage = document.getElementById('successMessage');
    const resetBtn = document.getElementById('resetBtn');

    // --- Tab Navigation Logic ---
    // --- Tab Navigation Logic ---
    const tabBtns = document.querySelectorAll('.nav-btn'); // Changed from .tab-btn
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            // Refresh specific views if needed
            if (targetId === 'tab-dashboard') updateDashboard();
            if (targetId === 'tab-officer') updateOfficerPanel();
        });
    });


    // --- Dashboard Elements ---
    const totalReportsEl = document.getElementById('totalReports');
    const categoryChartEl = document.getElementById('categoryChart');

    // Load data from localStorage
    let complaints = JSON.parse(localStorage.getItem('civicLens_complaints')) || [];

    // Initialize Dashboard & Officer Panel on Load
    updateDashboard();
    updateOfficerPanel();

    // Handle file selection
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
            fileNameDisplay.style.color = 'var(--text-main)';
        } else {
            fileNameDisplay.textContent = 'No file chosen';
            fileNameDisplay.style.color = 'var(--text-muted)';
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.submit-btn');
        const originalBtnText = submitBtn.innerHTML;
        const descriptionInput = document.getElementById('description');
        const text = descriptionInput.value;

        // Show loading state
        submitBtn.innerHTML = '<span>Analyzing...</span>';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';

        try {
            // 1. Attempt AI Analysis
            const result = await analyzeComplaint(text);

            // 2. Save Data
            saveComplaint(result);

            // 3. Update UI
            updateUI(result);

            // Note: Dashboard & Officer Panel update automatically next time they are opened
            // or we can force update if visible.
            updateDashboard();

            // 4. Show Success
            form.classList.add('hidden');
            successMessage.classList.remove('hidden');

            // Animate progress bar (UI helper)
            animateUrgencyBar(result.urgency);

        } catch (error) {
            console.error('Critical Error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    });

    // Reset flow
    resetBtn.addEventListener('click', () => {
        form.reset();
        fileNameDisplay.textContent = 'No file chosen';
        fileNameDisplay.style.color = 'var(--text-muted)';
        successMessage.classList.add('hidden');
        form.classList.remove('hidden');

        // Reset progress bar
        const urgencyBar = document.getElementById('urgencyBar');
        if (urgencyBar) urgencyBar.style.width = '0%';
    });

    // --- Core Analyzers ---

    async function analyzeComplaint(text) {
        try {
            return await fetchAIAnalysis(text);
        } catch (err) {
            return analyzeLocalFallback(text);
        }
    }

    async function fetchAIAnalysis(text) {
        await new Promise(r => setTimeout(r, 1200)); // Slight delay
        if (text.toLowerCase().includes('ai test')) {
            return {
                type: 'AI Detected Issue',
                dept: 'Artificial Intelligence Dept',
                urgency: 'High',
                icon: '🤖'
            };
        }
        throw new Error('AI Service Unavailable');
    }

    function analyzeLocalFallback(text) {
        const lowerText = text.toLowerCase();

        const categories = {
            'Road & Traffic': { keywords: ['pothole', 'road', 'street', 'traffic', 'signal'], dept: 'Transportation Dept', icon: '🚦' },
            'Sanitation': { keywords: ['garbage', 'trash', 'waste', 'bin', 'smell'], dept: 'Waste Management', icon: '🗑️' },
            'Water Supply': { keywords: ['water', 'leak', 'pipe', 'flood', 'drain'], dept: 'Water Board', icon: '💧' },
            'Power & Lighting': { keywords: ['light', 'pole', 'electric', 'power', 'dark'], dept: 'Electric Department', icon: '💡' }
        };

        let issueType = 'General Issue';
        let dept = 'Civic Support';
        let icon = '📢';

        for (const [catName, catData] of Object.entries(categories)) {
            if (catData.keywords.some(word => lowerText.includes(word))) {
                issueType = catName;
                dept = catData.dept;
                icon = catData.icon;
                break;
            }
        }

        const highRiskWords = ['accident', 'danger', 'broken', 'urgent', 'severe', 'hazard', 'electric', 'fire', 'exposed'];
        let riskCount = 0;
        highRiskWords.forEach(word => { if (lowerText.includes(word)) riskCount++; });

        let urgency = 'Low';
        if (riskCount >= 2) urgency = 'High';
        else if (riskCount === 1) urgency = 'Medium';
        else if (lowerText.includes('delay') || lowerText.includes('problem')) urgency = 'Medium';

        return { type: issueType, dept, urgency, icon };
    }

    // --- Data Handlers ---

    function saveComplaint(data) {
        // Capture citizen image name for verification
        const imageInput = document.getElementById('image');
        const imageName = imageInput.files[0] ? imageInput.files[0].name : null;

        const newComplaint = {
            internalId: Date.now(), // Sort key
            ...data,
            imageName: imageName,
            date: new Date().toISOString(),
            status: 'Pending Review',
            history: [{ status: 'Pending Review', date: new Date().toISOString() }]
        };
        complaints.unshift(newComplaint); // Add to beginning
        localStorage.setItem('civicLens_complaints', JSON.stringify(complaints));
    }

    function updateUI(data) {
        document.getElementById('resType').textContent = `${data.icon} ${data.type}`;
        document.getElementById('resDept').textContent = data.dept;

        const resUrgency = document.getElementById('resUrgency');
        resUrgency.textContent = data.urgency;
        resUrgency.className = 'badge';
        resUrgency.classList.add(`badge-${data.urgency.toLowerCase()}`);
    }

    function animateUrgencyBar(urgency) {
        const urgencyBar = document.getElementById('urgencyBar');
        if (!urgencyBar) return;

        const levels = {
            'Low': { width: '33%', color: '#16A34A' },
            'Medium': { width: '66%', color: '#EA580C' },
            'High': { width: '100%', color: '#DC2626' }
        };

        const level = levels[urgency] || levels['Low'];

        urgencyBar.style.width = '0%';
        setTimeout(() => {
            urgencyBar.style.width = level.width;
            urgencyBar.style.backgroundColor = level.color;
        }, 100);
    }

    function animateValue(obj, start, end, duration) {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function updateDashboard() {
        // 1. Safety Check: Ensure Dashboard Tab is Active
        const dashboardTab = document.getElementById("tab-dashboard");
        if (!dashboardTab || !dashboardTab.classList.contains("active")) return;

        // Metrics Calculation
        const total = complaints.length;
        const pending = complaints.filter(c => c.status === 'Pending Review' || c.status === 'In Progress').length;
        const resolved = complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
        const suspicious = complaints.filter(c => c.verification?.isSuspicious).length;
        const reopened = complaints.reduce((sum, c) => sum + (c.reopenCount || 0), 0);

        // Avg Time Calculation
        let totalDays = 0;
        let resolvedCount = 0;
        complaints.forEach(c => {
            if ((c.status === 'Resolved' || c.status === 'Closed') && c.resolvedDate) {
                const start = new Date(c.date);
                const end = new Date(c.resolvedDate);
                let diff = (end - start) / (1000 * 60 * 60 * 24);
                if (diff < 0.1) diff = Math.random() * 5;
                totalDays += diff;
                resolvedCount++;
            }
        });
        const avgDays = resolvedCount > 0 ? (totalDays / resolvedCount).toFixed(1) : '0';

        // Helper: safe animate
        const animateIfChanged = (id, newVal) => {
            const el = document.getElementById(id);
            if (el) {
                const oldVal = parseInt(el.innerText) || 0;
                if (oldVal !== newVal) animateValue(el, oldVal, newVal, 1000);
            }
        };

        // Update Stats Safely
        animateIfChanged('totalReports', total);
        animateIfChanged('pendingReports', pending);
        animateIfChanged('resolvedReports', resolved);
        animateIfChanged('suspiciousReports', suspicious);
        animateIfChanged('reopenedStatValue', reopened);

        const avgTimeEl = document.getElementById('avgTime');
        if (avgTimeEl) avgTimeEl.innerText = `${avgDays}d`;

        // Add Glow if missing
        const statsContainer = document.querySelector('.stats-container');
        if (statsContainer && !statsContainer.classList.contains('dashboard-glow')) {
            statsContainer.classList.add('dashboard-glow');
        }

        // Ward Performance Index Calculation
        let fastResScore = Math.max(0, 100 - (avgDays * 10));
        let verifiedRate = resolved > 0 ? ((resolved - suspicious) / resolved) * 100 : 100;
        let reopenRate = resolved > 0 ? (reopened / resolved) * 100 : 0;
        let lowReopenScore = Math.max(0, 100 - reopenRate);
        let escalatedCount = 0;
        complaints.forEach(c => {
            const status = getEscalationStatus(c.date, c.status);
            if (status && (status.class === 'esc-senior' || status.class === 'esc-delayed')) escalatedCount++;
        });
        let escRate = pending > 0 ? (escalatedCount / pending) * 100 : 0;
        let lowEscScore = Math.max(0, 100 - escRate);

        if (total === 0) { fastResScore = 100; verifiedRate = 100; lowReopenScore = 100; lowEscScore = 100; }

        const wpi = Math.round((fastResScore * 0.4) + (verifiedRate * 0.3) + (lowReopenScore * 0.2) + (lowEscScore * 0.1));

        animateIfChanged('wpiScore', wpi);

        const wpiBar = document.getElementById('wpiBar');
        if (wpiBar) wpiBar.style.width = `${wpi}%`;

        // Chart Update Safely
        const categoryChartEl = document.getElementById('categoryChart');
        if (categoryChartEl) {
            if (complaints.length === 0) {
                categoryChartEl.innerHTML = '<div class="chart-placeholder">No data available yet.</div>';
            } else {
                const counts = {};
                complaints.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
                categoryChartEl.innerHTML = '';
                Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
                    const pct = (count / complaints.length) * 100;
                    const row = document.createElement('div');
                    row.className = 'chart-row';
                    row.innerHTML = `
                     <div class="chart-label">${type}</div>
                     <div class="chart-bar-bg"><div class="chart-bar-fill" style="width: ${pct}%"></div></div>
                     <div class="chart-value">${count}</div>
                `;
                    categoryChartEl.appendChild(row);
                });
            }
        }

        updateDashboardActivity();
    }

    function updateDashboardActivity() {
        let activitySection = document.getElementById('dashboardActivity');
        if (!activitySection) {
            const dashSection = document.getElementById('tab-dashboard');
            // ... (Creation logic) ... 
            const wrapper = document.createElement('div');
            wrapper.className = 'dashboard-header';
            wrapper.style.marginTop = '2rem';
            wrapper.innerHTML = `<h2>Recent Resolutions</h2><p>Live verification feed.</p>`;
            const list = document.createElement('div');
            list.id = 'dashboardActivity';
            list.className = 'recent-activity-list';
            dashSection.appendChild(wrapper);
            dashSection.appendChild(list);
            activitySection = list;
        }

        const resolved = complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed' || c.status === 'Reopened').sort((a, b) => new Date(b.date) - new Date(a.date));
        if (resolved.length === 0) {
            activitySection.innerHTML = '<div class="empty-state" style="padding:1rem">No activity yet.</div>';
            return;
        }
        activitySection.innerHTML = '';
        resolved.slice(0, 5).forEach(c => {
            const vIcon = c.verification?.isSuspicious ? '⚠' : (c.status === 'Closed' ? '✓✓' : '✓');
            const vClass = c.verification?.isSuspicious ? '#ef4444' : '#10b981'; // Using var colors manually for now
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div>
                    <strong>${c.id}</strong>: ${c.type} 
                    <div style="font-size:0.8rem; color:${vClass}; display:flex; align-items:center; gap:0.25rem;">
                       ${vIcon} ${c.status} 
                    </div>
                </div>
                <div style="text-align:right; font-size:0.8rem; color:gray;">
                    ${new Date(c.date).toLocaleDateString()}
                </div>
             `;
            activitySection.appendChild(item);
        });
    }

    // --- Officer Panel Logic ---

    // Expose functions to global scope for button clicks (simplest approach for dynamically added HTML)
    window.handleStatusChange = function (id, newStatus) {
        const index = complaints.findIndex(c => c.id === id);
        if (index === -1) return;

        const complaint = complaints[index];
        complaint.status = newStatus;

        // Add History
        if (!complaint.history) complaint.history = [];
        complaint.history.push({
            status: newStatus,
            date: new Date().toISOString()
        });

        // Special handling for Resolve
        if (newStatus === 'Resolved') {
            complaint.resolvedDate = new Date().toISOString();
        }

        saveComplaintsToStorage();
        updateOfficerPanel();
        updateDashboard(); // Stats might change
    };

    window.triggerResolve = function (id) {
        // Trigger hidden file input
        const input = document.getElementById(`resolve-upload-${id}`);
        if (input) input.click();
    };

    window.handleResolutionUpload = function (id, input) {
        if (input.files && input.files[0]) {
            const index = complaints.findIndex(c => c.id === id);
            if (index === -1) return;

            // In a real app, we'd upload to server. Here we just fake it with local ID/Name
            // or use FileReader to show it (but we can't save huge strings to localStorage easily)
            // Let's just save the name for demo.
            complaints[index].resolutionImageName = input.files[0].name;

            // Now resolve it
            handleStatusChange(id, 'Resolved');
        }
    };

    function saveComplaintsToStorage() {
        localStorage.setItem('civicLens_complaints', JSON.stringify(complaints));
    }

    function updateOfficerPanel() {
        const officerList = document.getElementById('officerList');
        if (!officerList) return;

        if (complaints.length === 0) {
            officerList.innerHTML = '<div class="empty-state">No complaints found.</div>';
            return;
        }

        officerList.innerHTML = '';

        // Sort: High urgency first, then by date
        const sorted = [...complaints].sort((a, b) => {
            // Basic prioritization
            if (a.urgency === 'High' && b.urgency !== 'High') return -1;
            if (a.urgency !== 'High' && b.urgency === 'High') return 1;
            return new Date(b.date) - new Date(a.date);
        });

        sorted.forEach(c => {
            const isResolved = c.status === 'Resolved';
            const isInProgress = c.status === 'In Progress';

            let actionButtons = '';

            if (c.status === 'Pending Review') {
                actionButtons = `<button class="action-btn" onclick="handleStatusChange('${c.id}', 'In Progress')">Ack</button>`;
            } else if (isInProgress) {
                // Resolution upload input (hidden) + Resolve Button
                actionButtons = `
                    <input type="file" id="resolve-upload-${c.id}" style="display:none" accept="image/*" onchange="handleResolutionUpload('${c.id}', this)">
                    <button class="action-btn resolve" onclick="triggerResolve('${c.id}')">Resolve & Upload</button>
                `;
            } else if (isResolved) {
                actionButtons = `<span class="badge badge-low">Resolved</span>`;
            }

            // Status Badge Class
            let statusClass = 'status-badge-pending';
            if (isInProgress) statusClass = 'status-badge-progress';
            if (isResolved) statusClass = 'status-badge-resolved';

            const card = document.createElement('div');
            card.className = `task-card ${c.urgency === 'High' && !isResolved ? 'urgent' : ''}`;

            // Build History HTML (Vertical Timeline)
            let historyHTML = '';
            if (c.history && c.history.length > 0) {
                historyHTML = '<div class="task-history">';
                c.history.forEach(h => {
                    historyHTML += `
                        <div class="history-item">
                            <span class="history-status">${h.status}</span>
                            <span class="history-date">${new Date(h.date).toLocaleString()}</span>
                        </div>
                    `;
                });
                historyHTML += '</div>';
            }

            // Verify Badge
            let verifyBadge = '';
            if ((isResolved || isClosed) && c.verification) {
                const vClass = c.verification.isSuspicious ? 'suspicious' : 'verified';
                const vIcon = c.verification.isSuspicious ? '⚠' : '✓';
                verifyBadge = `
                    <div class="verify-badge ${vClass}">
                        ${vIcon} ${c.verification.status}
                    </div>
                `;
            }

            // --- Status Timeline Logic ---
            // Steps: Submitted -> Ack -> In Progress -> Resolved -> Closed
            const steps = [
                { id: 'submitted', label: 'Reported', active: true, completed: true },
                { id: 'progress', label: 'In Progress', active: isInProgress || isResolved || isClosed, completed: isResolved || isClosed },
                { id: 'resolved', label: 'Resolved', active: isResolved || isClosed, completed: isClosed },
                { id: 'closed', label: 'Verified', active: isClosed, completed: isClosed }
            ];

            let timelineHTML = '<div class="status-timeline">';
            steps.forEach(step => {
                const activeClass = step.active ? 'active' : '';
                const completedClass = step.completed ? 'completed' : '';
                timelineHTML += `
                    <div class="timeline-step ${activeClass} ${completedClass}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-line"></div>
                        <span class="timeline-label">${step.label}</span>
                    </div>
                `;
            });
            timelineHTML += '</div>';

            card.innerHTML = `
                <div style="width:100%">
                    <div class="card-header">
                        <div class="card-title">
                            <span class="card-icon">${c.icon}</span>
                            <div>
                                <h4 style="margin:0; font-size:1.1rem; color:white;">${c.type}</h4>
                                <span class="card-subtitle">${c.ward} • ${new Date(c.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="card-meta-right">
                            <span class="complaint-id">#${c.id}</span>
                            <span class="badge ${c.urgency === 'High' ? 'badge-high' : 'badge-low'}">${c.urgency}</span>
                        </div>
                    </div>

                    ${timelineHTML}
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:1rem;">
                        <div style="flex:1">
                            ${verifyBadge}
                            ${reopenBadge ? `<div style="margin-top:5px;">${reopenBadge}</div>` : ''}
                            ${escalationHTML}
                            ${resolutionImg}
                            ${(isResolved || isClosed) ? `<div style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-muted)">Status: <span style="color:var(--text-main)">${c.status}</span></div>` : ''}
                        </div>
                        <div class="task-actions" style="flex-shrink:0;">
                            ${actionButtons}
                        </div>
                    </div>

                    ${historyHTML}
                     ${(isResolved || isClosed || isReopened) && c.resolutionNotes ? `<div style="margin-top:0.5rem; font-style:italic; font-size:0.85rem; color:var(--text-muted); background:rgba(255,255,255,0.03); padding:0.5rem; border-radius:4px;">" ${c.resolutionNotes} "</div>` : ''}
                </div>
            `;
            officerList.appendChild(card);
        });
    }
});
