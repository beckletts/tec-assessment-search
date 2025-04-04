// Global variables
let assessmentData = [];
let filteredData = [];

// Elements
const qualificationSelect = document.getElementById('qualification');
const sectorSelect = document.getElementById('sector');
const examTypeSelect = document.getElementById('exam-type');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');
const searchTermInput = document.getElementById('search-term');
const resetFiltersBtn = document.getElementById('reset-filters');
const applyFiltersBtn = document.getElementById('apply-filters');
const resultsTable = document.getElementById('results-table');
const resultsBody = document.getElementById('results-body');
const resultCount = document.getElementById('result-count');
const loadingElement = document.getElementById('loading');
const noResultsElement = document.getElementById('no-results');
const upcomingBody = document.getElementById('upcoming-body');
const upcomingCount = document.getElementById('upcoming-count');
const detailsModal = document.getElementById('details-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load data from Apps Script
    loadDataFromAppsScript();
    
    // Setup event listeners
    setupEventListeners();
});

// Load data from Google Apps Script using JSONP
function loadDataFromAppsScript() {
    loadingElement.style.display = 'block';
    noResultsElement.style.display = 'none';
    
    // Replace with your actual deployed Apps Script URL
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbwsTZTXEdXTDVKXPpJhunMDLhj0MYgs1x65Ma95mHXjtR3fPZE34YRO8Nxm0mJwCcQ0/exec';
    
    // Create a script element for JSONP
    const script = document.createElement('script');
    
    // Set a global callback function
    window.handleAppsScriptResponse = function(data) {
        console.log('Data received from Apps Script:', data);
        
        // Process the data
        assessmentData = [];
        
        // Loop through each sheet
        if (data && data.sheets) {
            Object.keys(data.sheets).forEach(sheetName => {
                const sheetData = data.sheets[sheetName].data;
                
                // Add each row to the assessmentData array
                sheetData.forEach(row => {
                    if (row.Qualification || row.qualification) {
                        assessmentData.push({
                            sheet: sheetName,
                            qualification: row.Qualification || row.qualification || '',
                            sector: row.Sector || row.Subject || row.sector || '',
                            componentCode: row['Component Code'] || row['Component\nCode'] || row['Examination code'] || row['Component/Unit Code'] || '',
                            componentName: row['Component Name'] || row.Title || row['Component/Unit Name'] || '',
                            examType: row['Exam/Task'] || row['Task/Test'] || row['Assessment Type'] || '',
                            duration: row.Duration || '',
                            access: row.Access || row['Access Arrangement'] || '',
                            levelOfControl: row['Level of control'] || '',
                            additionalInfo: row['Additional information'] || row.Notes || '',
                            invigilator: row['Internal/External invigilator required'] || row['Invigilator Type'] || '',
                            qualificationSizes: row['Qualification Sizes\n(Double click to expand cell to see all qualifications)'] || row['Qualification Sizes'] || '',
                            releaseDate: parseDate(row['Release Date']),
                            windowStart: parseDate(row['Window start'] || row['Start Date']),
                            windowEnd: parseDate(row['Window end'] || row['End Date']),
                            submissionDeadline: parseDate(row['Submission deadline'] || row.Deadline)
                        });
                    }
                });
            });
        }
        
        // Initialize the UI with the processed data
        initializeUI();
        
        // Remove the script tag once done
        document.body.removeChild(script);
        
        // Hide loading indicator
        loadingElement.style.display = 'none';
    };
    
    // Add cache-busting parameter and callback function name
    script.src = `${appsScriptUrl}?callback=handleAppsScriptResponse&cache=${new Date().getTime()}`;
    
    // Add error handling
    script.onerror = function() {
        console.error('Error fetching data from Apps Script. Falling back to sample data.');
        useSampleData();
        loadingElement.style.display = 'none';
    };
    
    // Add a timeout in case the script doesn't load or callback doesn't fire
    const timeoutId = setTimeout(function() {
        if (assessmentData.length === 0) {
            console.error('Timeout fetching data from Apps Script. Falling back to sample data.');
            useSampleData();
            loadingElement.style.display = 'none';
        }
    }, 10000); // 10 seconds timeout
    
    // Clean up timeout when data is received
    const originalCallback = window.handleAppsScriptResponse;
    window.handleAppsScriptResponse = function(data) {
        clearTimeout(timeoutId);
        originalCallback(data);
    };
    
    // Append to document to load the script
    document.body.appendChild(script);
}

// Parse dates from various formats
function parseDate(dateValue) {
    if (!dateValue) return null;
    
    // If it's already a Date object
    if (dateValue instanceof Date) {
        return dateValue;
    }
    
    // Handle Excel/Google Sheets date serial numbers
    if (typeof dateValue === 'number') {
        // Excel's epoch is different (1899-12-30)
        const excelEpoch = new Date(1899, 11, 30);
        const millisPerDay = 24 * 60 * 60 * 1000;
        return new Date(excelEpoch.getTime() + dateValue * millisPerDay);
    }
    
    // Try to parse date strings
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
}

// Use sample data for the app
function useSampleData() {
    console.log("Using sample data...");
    // Sample data based on the Excel file structure
    assessmentData = [
        {
            sheet: "Nationals",
            qualification: "RQF BTEC National",
            sector: "Music Performance",
            componentCode: "20175K",
            componentName: "Unit 3: Ensemble Music Performance",
            examType: "Task",
            duration: "Prep: 30 hours. Supervised: 2 hours (written activity) plus time stipulated for recording practical evidence",
            access: "Web Release",
            levelOfControl: "Medium Control and High Control",
            additionalInfo: "Learners are allowed to bring up to two A4 sides of notes into Activity 2 and two A4 sides of notes into Activity 5.",
            invigilator: "Internal",
            qualificationSizes: "Pearson BTEC Level 3 National Extended Certificate in Music Performance (360 GLH) 601/7090/6",
            releaseDate: new Date("2025-01-06"),
            windowStart: new Date("2025-04-30"),
            windowEnd: new Date("2025-05-15"),
            submissionDeadline: new Date("2025-05-19")
        },
        {
            sheet: "Nationals",
            qualification: "RQF BTEC National",
            sector: "Music Performance",
            componentCode: "20177K",
            componentName: "Unit 2: Professional Practice in the Music Industry",
            examType: "Task",
            duration: "Prep: 3 hours (monitored) Supervised: 5 hours",
            access: "Web Release",
            levelOfControl: "Medium Control and High Control",
            additionalInfo: "Learners must complete this task on a computer using word processing software.",
            invigilator: "Internal",
            qualificationSizes: "Pearson BTEC Level 3 National Extended Certificate in Music Performance (360 GLH) 601/7090/6",
            releaseDate: new Date("2025-05-06"),
            windowStart: new Date("2025-05-06"),
            windowEnd: new Date("2025-05-22"),
            submissionDeadline: new Date("2025-05-26")
        },
        {
            sheet: "Firsts",
            qualification: "NQF BTEC First",
            sector: "Business",
            componentCode: "21325E",
            componentName: "Unit 9: Principles of Marketing",
            examType: "Exam",
            duration: "1h 30m",
            access: "Secure dispatch",
            levelOfControl: "High control",
            additionalInfo: "You do not need any other materials.",
            invigilator: "Internal",
            releaseDate: new Date("2025-01-15"),
            windowStart: new Date("2025-02-01"),
            windowEnd: new Date("2025-02-15"),
            submissionDeadline: new Date("2025-02-15")
        },
        {
            sheet: "Technicals",
            qualification: "BTEC Technical",
            sector: "CPLD (Early Years Practitioner)",
            componentCode: "21221K",
            componentName: "Unit 2: Child Development from Birth up to Five Years",
            examType: "Task",
            duration: "Supervised: 2h 30m",
            access: "Secure dispatch",
            levelOfControl: "High Control",
            additionalInfo: "You do not need any other materials.",
            invigilator: "Internal",
            releaseDate: new Date("2025-03-10"),
            windowStart: new Date("2025-04-01"),
            windowEnd: new Date("2025-04-15"),
            submissionDeadline: new Date("2025-04-16")
        },
        {
            sheet: "Tech Award from 2022",
            qualification: "BTEC Tech Award 2022",
            sector: "Animal Care",
            componentCode: "BAC03",
            componentName: "Animal Health and Welfare",
            examType: "Exam",
            duration: "2 hours",
            access: "Secure dispatch",
            levelOfControl: "High control",
            additionalInfo: "You do not need any other materials.",
            invigilator: "Internal",
            releaseDate: new Date("2025-04-20"),
            windowStart: new Date("2025-05-01"),
            windowEnd: new Date("2025-05-18"),
            submissionDeadline: new Date("2025-05-19")
        },
        {
            sheet: "Firsts",
            qualification: "NQF BTEC First",
            sector: "Creative Digital Media Production",
            componentCode: "21525E",
            componentName: "Unit 1: Digital Media Sectors and Audiences",
            examType: "Exam",
            duration: "1h",
            access: "Secure dispatch",
            levelOfControl: "High control",
            additionalInfo: "You do not need any other materials.",
            invigilator: "Internal",
            releaseDate: new Date("2025-05-15"),
            windowStart: new Date("2025-06-01"),
            windowEnd: new Date("2025-06-15"),
            submissionDeadline: new Date("2025-06-15")
        },
        {
            sheet: "Firsts",
            qualification: "NQF BTEC First",
            sector: "Hospitality",
            componentCode: "21625E",
            componentName: "Unit 1: Introducing the Hospitality Industry",
            examType: "Exam",
            duration: "1h",
            access: "Secure dispatch",
            levelOfControl: "High control",
            additionalInfo: "You do not need any other materials.",
            invigilator: "Internal",
            releaseDate: new Date("2025-02-15"),
            windowStart: new Date("2025-03-01"),
            windowEnd: new Date("2025-03-15"),
            submissionDeadline: new Date("2025-03-15")
        },
        {
            sheet: "Nationals",
            qualification: "RQF BTEC National",
            sector: "Engineering",
            componentCode: "31563H",
            componentName: "Unit 1: Engineering Principles",
            examType: "Exam",
            duration: "2h",
            access: "Secure dispatch",
            levelOfControl: "High control",
            additionalInfo: "Calculator and formulae sheet allowed.",
            invigilator: "External",
            qualificationSizes: "Pearson BTEC Level 3 National Diploma in Engineering (720 GLH)",
            releaseDate: new Date("2025-04-10"),
            windowStart: new Date("2025-05-20"),
            windowEnd: new Date("2025-05-20"),
            submissionDeadline: new Date("2025-05-20")
        }
    ];
    
    // Initialize the UI
    initializeUI();
    
    // Ensure loading spinner is hidden
    loadingElement.style.display = 'none';
}

// Initialize the UI with data
function initializeUI() {
    // Populate dropdowns
    populateDropdowns();
    
    // Apply initial filters
    applyFilters();
    
    // Show upcoming assessments
    showUpcomingAssessments();
    
    // Hide loading indicator
    loadingElement.style.display = 'none';
}

// Populate filter dropdowns
function populateDropdowns() {
    // Clear existing options (except the first one)
    qualificationSelect.innerHTML = '<option value="">All Qualifications</option>';
    sectorSelect.innerHTML = '<option value="">All Sectors</option>';
    
    // Get unique values
    const qualifications = [...new Set(assessmentData.map(item => item.qualification))].filter(q => q).sort();
    const sectors = [...new Set(assessmentData.map(item => item.sector))].filter(s => s).sort();
    
    // Populate qualification dropdown
    qualifications.forEach(qual => {
        const option = document.createElement('option');
        option.value = qual;
        option.textContent = qual;
        qualificationSelect.appendChild(option);
    });
    
    // Populate sector dropdown
    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        sectorSelect.appendChild(option);
    });
}

// Apply filters to data
function applyFilters() {
    const qualification = qualificationSelect.value;
    const sector = sectorSelect.value;
    const examType = examTypeSelect.value;
    const dateFrom = dateFromInput.value ? new Date(dateFromInput.value) : null;
    const dateTo = dateToInput.value ? new Date(dateToInput.value) : null;
    const searchTerm = searchTermInput.value.toLowerCase();
    
    filteredData = assessmentData.filter(item => {
        // Filter by qualification
        if (qualification && item.qualification !== qualification) return false;
        
        // Filter by sector
        if (sector && item.sector !== sector) return false;
        
        // Filter by exam type
        if (examType && item.examType !== examType) return false;
        
        // Filter by date range (using submission deadline)
        if (dateFrom && item.submissionDeadline && item.submissionDeadline < dateFrom) return false;
        if (dateTo && item.submissionDeadline && item.submissionDeadline > dateTo) return false;
        
        // Filter by search term
        if (searchTerm) {
            const searchFields = [
                item.qualification,
                item.sector,
                item.componentCode,
                item.componentName,
                item.examType
            ].map(field => field ? field.toLowerCase() : '');
            
            return searchFields.some(field => field.includes(searchTerm));
        }
        
        return true;
    });
    
    // Update the table
    updateResultsTable();
}

// Update the results table
function updateResultsTable() {
    // Clear the table
    resultsBody.innerHTML = '';
    
    // Update result count
    resultCount.textContent = `(${filteredData.length})`;
    
    // Check if we have results
    if (filteredData.length === 0) {
        resultsTable.style.display = 'none';
        noResultsElement.style.display = 'block';
        return;
    }
    
    // Show table, hide no results message
    resultsTable.style.display = 'table';
    noResultsElement.style.display = 'none';
    
    // Sort by submission deadline (closest first)
    const sortedData = [...filteredData].sort((a, b) => {
        if (!a.submissionDeadline) return 1;
        if (!b.submissionDeadline) return -1;
        return a.submissionDeadline - b.submissionDeadline;
    });
    
    // Add rows to the table
    sortedData.forEach((item, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.qualification || 'N/A'}</td>
            <td>${item.sector || 'N/A'}</td>
            <td>${item.componentCode || 'N/A'}</td>
            <td>${item.componentName || 'N/A'}</td>
            <td>
                <span class="status-pill status-${(item.examType || 'unknown').toLowerCase()}">${item.examType || 'N/A'}</span>
            </td>
            <td>${formatDate(item.releaseDate)}</td>
            <td>${formatDate(item.windowStart)} - ${formatDate(item.windowEnd)}</td>
            <td>${formatDate(item.submissionDeadline)}</td>
            <td class="action-cell">
                <button class="primary-btn" onclick="showDetails(${index})">Details</button>
            </td>
        `;
        
        resultsBody.appendChild(row);
    });
}

// Format date for display
function formatDate(date) {
    if (!date) return 'N/A';
    try {
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    } catch (e) {
        console.error('Error formatting date:', date, e);
        return 'Invalid Date';
    }
}

// Show upcoming assessments
function showUpcomingAssessments() {
    // Clear the table
    upcomingBody.innerHTML = '';
    
    // Get today's date
    const today = new Date();
    
    // Filter upcoming assessments (release date in the next 30 days)
    const upcomingAssessments = assessmentData.filter(item => {
        if (!item.releaseDate) return false;
        
        const daysUntilRelease = Math.ceil((item.releaseDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilRelease >= 0 && daysUntilRelease <= 30;
    });
    
    // Update result count
    upcomingCount.textContent = `(${upcomingAssessments.length})`;
    
    // Sort by release date (closest first)
    const sortedUpcoming = [...upcomingAssessments].sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate - b.releaseDate;
    });
    
    // Add rows to the table
    sortedUpcoming.forEach((item, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.qualification || 'N/A'}</td>
            <td>${item.sector || 'N/A'}</td>
            <td>${item.componentCode || 'N/A'}</td>
            <td>${item.componentName || 'N/A'}</td>
            <td>
                <span class="status-pill status-${(item.examType || 'unknown').toLowerCase()}">${item.examType || 'N/A'}</span>
            </td>
            <td>${formatDate(item.releaseDate)}</td>
            <td>${formatDate(item.windowStart)} - ${formatDate(item.windowEnd)}</td>
            <td>${formatDate(item.submissionDeadline)}</td>
            <td class="action-cell">
                <button class="primary-btn" onclick="showDetails(${filteredData.indexOf(item)})">Details</button>
            </td>
        `;
        
        upcomingBody.appendChild(row);
    });
}

// Show assessment details in modal
function showDetails(index) {
    const item = filteredData[index];
    
    // If item not found, return
    if (!item) return;
    
    // Set modal title
    modalTitle.textContent = `${item.componentCode}: ${item.componentName}`;
    
    // Build modal content
    const detailsHTML = `
        <div class="detail-row">
            <div class="detail-label">Qualification</div>
            <div class="detail-value">${item.qualification || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Sector</div>
            <div class="detail-value">${item.sector || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Component Code</div>
            <div class="detail-value">${item.componentCode || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Component Name</div>
            <div class="detail-value">${item.componentName || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Assessment Type</div>
            <div class="detail-value">${item.examType || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Duration</div>
            <div class="detail-value">${item.duration || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Access</div>
            <div class="detail-value">${item.access || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Level of Control</div>
            <div class="detail-value">${item.levelOfControl || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Invigilator</div>
            <div class="detail-value">${item.invigilator || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Release Date</div>
            <div class="detail-value">${formatDate(item.releaseDate)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Window</div>
            <div class="detail-value">${formatDate(item.windowStart)} - ${formatDate(item.windowEnd)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Submission Deadline</div>
            <div class="detail-value">${formatDate(item.submissionDeadline)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Additional Information</div>
            <div class="detail-value">${item.additionalInfo || 'N/A'}</div>
        </div>
        ${item.qualificationSizes ? `
        <div class="detail-row">
            <div class="detail-label">Qualification Sizes</div>
            <div class="detail-value">${item.qualificationSizes}</div>
        </div>
        ` : ''}
    `;
    
    // Set modal content
    modalBody.innerHTML = detailsHTML;
    
    // Show the modal
    detailsModal.style.display = 'block';
}

// Setup event listeners
function setupEventListeners() {
    // Filter button
    applyFiltersBtn.addEventListener('click', applyFilters);
    
    // Reset filters button
    resetFiltersBtn.addEventListener('click', function() {
        qualificationSelect.value = '';
        sectorSelect.value = '';
        examTypeSelect.value = '';
        dateFromInput.value = '';
        dateToInput.value = '';
        searchTermInput.value = '';
        applyFilters();
    });
    
    // Close modal
    closeModal.addEventListener('click', function() {
        detailsModal.style.display = 'none';
    });
    
    // Close modal on outside click
    window.addEventListener('click', function(event) {
        if (event.target == detailsModal) {
            detailsModal.style.display = 'none';
        }
    });
    
    // Tab navigation
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to current tab
            this.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Show current tab content
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId + '-tab').classList.add('active');
        });
    });
    
    // Search on enter key
    searchTermInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            applyFilters();
        }
    });
    
    // Add the download button to filter controls
    const filterControls = document.querySelector('.filter-controls');
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'download-excel';
    downloadBtn.className = 'primary-btn';
    downloadBtn.innerHTML = '<i class="fas fa-file-excel"></i> Download Excel';
    filterControls.insertBefore(downloadBtn, document.getElementById('apply-filters'));
    downloadBtn.addEventListener('click', downloadFilteredDataAsExcel);
    
    // Add the download button to upcoming tab
    const upcomingHeader = document.querySelector('#upcoming-tab .results-header');
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.alignItems = 'center';
    buttonContainer.style.width = '100%';
    
    const titleElement = document.createElement('h2');
    titleElement.innerHTML = 'Upcoming Assessments <span id="upcoming-count" class="results-count">(0)</span>';
    
    const upcomingDownloadBtn = document.createElement('button');
    upcomingDownloadBtn.id = 'download-upcoming';
    upcomingDownloadBtn.className = 'primary-btn';
    upcomingDownloadBtn.innerHTML = '<i class="fas fa-file-excel"></i> Download';
    upcomingDownloadBtn.addEventListener('click', downloadUpcomingDataAsExcel);
    
    buttonContainer.appendChild(titleElement);
    buttonContainer.appendChild(upcomingDownloadBtn);
    
    upcomingHeader.innerHTML = '';
    upcomingHeader.appendChild(buttonContainer);
    
    // Update the upcoming count element reference
    upcomingCount = document.getElementById('upcoming-count');
}

// Function to download the filtered data as Excel
function downloadFilteredDataAsExcel() {
    // Check if we have data to download
    if (filteredData.length === 0) {
        alert('No data to download. Please adjust your filters to show some results first.');
        return;
    }
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert the filtered data to a format suitable for Excel
    const excelData = filteredData.map(item => ({
        'Qualification': item.qualification || '',
        'Sector': item.sector || '',
        'Component Code': item.componentCode || '',
        'Component Name': item.componentName || '',
        'Type': item.examType || '',
        'Duration': item.duration || '',
        'Access': item.access || '',
        'Level of Control': item.levelOfControl || '',
        'Invigilator': item.invigilator || '',
        'Release Date': item.releaseDate ? formatDateForExcel(item.releaseDate) : '',
        'Window Start': item.windowStart ? formatDateForExcel(item.windowStart) : '',
        'Window End': item.windowEnd ? formatDateForExcel(item.windowEnd) : '',
        'Submission Deadline': item.submissionDeadline ? formatDateForExcel(item.submissionDeadline) : '',
        'Additional Information': item.additionalInfo || ''
    }));
    
    // Create a worksheet from the data
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered Assessments');
    
    // Generate Excel file and download it
    XLSX.writeFile(wb, 'BTEC_External_Assessments.xlsx');
}

// Function to download upcoming assessments data
function downloadUpcomingDataAsExcel() {
    // Get today's date
    const today = new Date();
    
    // Filter upcoming assessments (release date in the next 30 days)
    const upcomingAssessments = assessmentData.filter(item => {
        if (!item.releaseDate) return false;
        
        const daysUntilRelease = Math.ceil((item.releaseDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilRelease >= 0 && daysUntilRelease <= 30;
    });
    
    if (upcomingAssessments.length === 0) {
        alert('No upcoming assessments to download.');
        return;
    }
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert the data to Excel format
    const excelData = upcomingAssessments.map(item => ({
        'Qualification': item.qualification || '',
        'Sector': item.sector || '',
        'Component Code': item.componentCode || '',
        'Component Name': item.componentName || '',
        'Type': item.examType || '',
        'Duration': item.duration || '',
        'Release Date': item.releaseDate ? formatDateForExcel(item.releaseDate) : '',
        'Window Start': item.windowStart ? formatDateForExcel(item.windowStart) : '',
        'Window End': item.windowEnd ? formatDateForExcel(item.windowEnd) : '',
        'Submission Deadline': item.submissionDeadline ? formatDateForExcel(item.submissionDeadline) : '',
        'Days Until Release': item.releaseDate ? Math.ceil((item.releaseDate - today) / (1000 * 60 * 60 * 24)) : ''
    }));
    
    // Create a worksheet from the data
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Upcoming Assessments');
    
     // Generate Excel file and download it
    XLSX.writeFile(wb, 'BTEC_Upcoming_Assessments.xlsx');
}

// Format date for Excel (YYYY-MM-DD format)
function formatDateForExcel(date) {
    if (!date) return '';
    
    try {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('Error formatting date for Excel:', date, e);
        return '';
    }
}

// Make showDetails function available globally
window.showDetails = showDetails;