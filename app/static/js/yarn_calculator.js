document.addEventListener('DOMContentLoaded', function () {
    // Theme handling
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // State of theme toggle
    function updateThemeToggleButton(theme) {
        if (themeToggle) {
            themeToggle.checked = (theme === 'dark');
        }
        if (mobileThemeToggle) {
            mobileThemeToggle.checked = (theme === 'dark');
        }
    }

    updateThemeToggleButton(savedTheme);

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
        
        updateThemeToggleButton(nextTheme);
    }

    themeToggle?.addEventListener('change', toggleTheme);
    mobileThemeToggle?.addEventListener('change', toggleTheme);

    // Form logic
    const form = document.getElementById('yarn-form');
    if (!form) return;

    const imageInput = document.getElementById('image-input');
    const fileUploadArea = document.getElementById('file-upload-area');
    const uploadContent = fileUploadArea.querySelector('.upload-content');
    const filePreview = fileUploadArea.querySelector('.file-preview');
    const removeFileBtn = document.getElementById('remove-file');
    const submitButton = document.getElementById('submit-button');
    const resultsContainer = document.getElementById('results-container');
    const formThicknessRadios = document.querySelectorAll('input[name="thickness"]');

    // "Ready for Analysis"
    function showEmptyState() {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <h3>Ready for Analysis</h3>
                <p>Upload your crochet project image to get detailed yarn usage estimates and stitch detection.</p>
                <div class="features-list">
                    <div class="feature">
                        <i class="fas fa-eye"></i>
                        <span>Automatic stitch detection</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-calculator"></i>
                        <span>Precise yarn calculations</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-chart-bar"></i>
                        <span>Detailed breakdowns</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Show initial state on first page load
    if(resultsContainer.children.length === 0) {
        showEmptyState();
    }
    
    // File selection and preview
    const handleFileSelect = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageInput.files = dataTransfer.files;
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('preview-image');
            previewImg.src = e.target.result;

            previewImg.alt = `Preview of ${file.name}`;
            document.getElementById('file-name').textContent = file.name;
            uploadContent.style.display = 'none';
            filePreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    };

    fileUploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => handleFileSelect(imageInput.files[0]));

    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        imageInput.value = '';
        uploadContent.style.display = 'block';
        filePreview.style.display = 'none';
        showEmptyState();
    });

    fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); fileUploadArea.classList.add('dragover'); });
    fileUploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); fileUploadArea.classList.remove('dragover'); });
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files[0]);
    });

    // AJAX form submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // validation when no file selected
        if (!imageInput.files || imageInput.files.length === 0) {
            // shake animation
            fileUploadArea.classList.add('shake');
            
            setTimeout(() => {
                fileUploadArea.classList.remove('shake');
            }, 500);
            
            return;
        }

        // Proceed with AJAX submission
        submitButton.disabled = true;
        form.querySelector('.submit-text').parentElement.style.display = 'none';
        form.querySelector('.loading-content').style.display = 'inline-flex';

        const formData = new FormData();
        formData.append('thickness', form.querySelector('input[name="thickness"]:checked')?.value || 'Medium');
        formData.append('image', imageInput.files[0]);


        try {
            const response = await fetch(form.action || window.location.href, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            resultsContainer.setAttribute('data-base-estimate', data.base_yarn_estimate);

            const stitchItems = Object.entries(data.stitch_counts)
                .map(([cls, count]) => `
                    <div class="stitch-item">
                        <span class="stitch-type">${cls}</span>
                        <span class="stitch-count">${count}×</span>
                    </div>
                `).join('');

            resultsContainer.innerHTML = `
                <div class="results-content">
                    <div class="results-header">
                        <i class="fas fa-chart-line"></i>
                        <h3>Analysis Results</h3>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card primary">
                            <div class="stat-icon"><i class="fas fa-ruler"></i></div>
                            <div class="stat-content">
                                <h4 id="yarn-estimate-value">${data.yarn_estimate} cm</h4>
                                <p>Estimated Usage</p>
                            </div>
                        </div>
                        <div class="stat-card secondary">
                            <div class="stat-icon"><i class="fas fa-chart-area"></i></div>
                            <div class="stat-content">
                                <h4 id="yarn-range-value">${data.yarn_range[0]}&nbsp;-&nbsp;${data.yarn_range[1]} cm</h4>
                                <p>Range with Margin</p>
                            </div>
                        </div>
                    </div>
                    <div class="stitch-breakdown">
                        <h4><i class="fas fa-list-ul"></i> Stitch Breakdown</h4>
                        <div class="stitch-list">${stitchItems}</div>
                    </div>
                    <div class="image-comparison">
                        <div class="comparison-tabs">
                            <button class="tab-btn active" data-tab="processed"><i class="fas fa-search"></i> Detected Stitches</button>
                            <button class="tab-btn" data-tab="original"><i class="fas fa-image"></i> Original</button>
                        </div>
                        <div class="image-container">
                            <div class="tab-content active" id="processed-tab"><img src="data:image/png;base64,${data.processed}" alt="Processed image" class="result-image"></div>
                            <div class="tab-content" id="original-tab"><img src="data:image/jpeg;base64,${data.original}" alt="Original image" class="result-image"></div>
                        </div>
                    </div>
                </div>
            `;

            addResultListeners();
            updateYarnCalculation();
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error('Submission Error:', error);
            resultsContainer.innerHTML = `<div class="empty-state"><div class="empty-icon" style="color: #ff6b6b;"><i class="fas fa-exclamation-triangle"></i></div><h3>An Error Occurred</h3><p>${error.message}</p></div>`;
        } finally {
            submitButton.disabled = false;
            form.querySelector('.submit-text').parentElement.style.display = 'inline-flex';
            form.querySelector('.loading-content').style.display = 'none';
        }
    });

    function addResultListeners() {
        resultsContainer.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                resultsContainer.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
                button.classList.add('active');
                resultsContainer.querySelector(`#${tabId}-tab`).classList.add('active');
            });
        });
    }

    function updateYarnCalculation() {
        const baseEstimate = parseFloat(resultsContainer.dataset.baseEstimate);
        if (isNaN(baseEstimate)) {
            return;
        }

        const selectedThickness = document.querySelector('input[name="thickness"]:checked').value;
        const multipliers = { "Thin": 0.8, "Medium": 1.0, "Thick": 1.3 };
        const errorMargin = 0.10;
        const multiplier = multipliers[selectedThickness] || 1.0;

        const newEstimate = baseEstimate * multiplier;
        const min_yarn = newEstimate * (1 - errorMargin);
        const max_yarn = newEstimate * (1 + errorMargin);

        const estimateEl = document.getElementById('yarn-estimate-value');
        const rangeEl = document.getElementById('yarn-range-value');

        if (estimateEl) estimateEl.textContent = `${newEstimate.toFixed(1)} cm`;
        if (rangeEl) rangeEl.innerHTML = `${min_yarn.toFixed(1)}&nbsp;-&nbsp;${max_yarn.toFixed(1)} cm`;
    }

    formThicknessRadios.forEach(radio => {
        radio.addEventListener('change', updateYarnCalculation);
    });

    // Sample image handling
    const sampleImages = document.querySelectorAll('.sample-image');
    
    sampleImages.forEach(sampleImg => {
    sampleImg.addEventListener('click', async function () {
        const sampleType = this.dataset.sample;
        const imgElement = this.querySelector('img');
        const imgSrc = imgElement.src;

        // Click effect
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);

        try {
            const response = await fetch(imgSrc);
            const blob = await response.blob();

            // Create file
            const file = new File([blob], `sample-${sampleType}.jpg`, { type: 'image/jpeg' });

            // Load into form
            handleFileSelect(file);

            // note: NOT submitting automatically — user must click "Analyse Project"

        } catch (error) {
            console.error('Error loading sample image:', error);
            alert('Error loading sample image. Please try uploading your own image.');
        }
    });

    // Hover effect
    sampleImg.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.05)';
    });

    sampleImg.addEventListener('mouseleave', function () {
        this.style.transform = '';
    });
});
});