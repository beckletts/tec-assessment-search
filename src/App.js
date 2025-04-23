import React, { useState, useEffect } from 'react';
import { read, utils, writeFile } from 'xlsx';
import './App.css';

function FilterGroup({ title, options, selected, onChange, name }) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="filter-group">
      <div className="filter-group-header" onClick={() => setIsOpen(!isOpen)}>
        <label>
          {title}
          {selected.length > 0 && (
            <span className="selected-count">{selected.length}</span>
          )}
        </label>
        <i className={`chevron ${isOpen ? 'up' : 'down'}`} />
      </div>
      {isOpen && (
        <>
          <div className="checkbox-group">
            <div className="checkbox-group-search">
              <input
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="checkbox-options">
              {filteredOptions.map(option => (
                <label
                  key={option}
                  className={`checkbox-label ${selected.includes(option) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    name={name}
                    value={option}
                    checked={selected.includes(option)}
                    onChange={onChange}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {option}
                </label>
              ))}
              {filteredOptions.length === 0 && (
                <div style={{ padding: '10px', color: '#666', textAlign: 'center' }}>
                  No matches found
                </div>
              )}
            </div>
          </div>
          <div className="filter-group-footer">
            <button
              className="secondary-btn"
              onClick={(e) => {
                e.stopPropagation();
                onChange({
                  target: {
                    name,
                    type: 'checkbox',
                    checked: false,
                    value: selected.join(',')
                  }
                });
              }}
            >
              Clear
            </button>
            <button
              className="primary-btn"
              onClick={(e) => {
                e.stopPropagation();
                onChange({
                  target: {
                    name,
                    type: 'checkbox',
                    checked: true,
                    value: filteredOptions.join(',')
                  }
                });
              }}
            >
              Select All
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  const [assessmentData, setAssessmentData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [filters, setFilters] = useState({
    qualification: '',
    sector: '',
    examType: '',
    searchTerm: ''
  });

  // Format date from Excel serial number
  const formatDate = (serialNumber) => {
    if (!serialNumber) return '';
    try {
      // Excel's epoch starts from 1899-12-30
      const epoch = new Date(1899, 11, 30);
      const offsetDays = serialNumber;
      const resultDate = new Date(epoch.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      
      // Format date as DD/MM/YYYY
      return resultDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return serialNumber; // Return original value if parsing fails
    }
  };

  // Load Excel data on component mount
  useEffect(() => {
    const loadExcelData = async () => {
      try {
        setLoading(true);
        console.log('Starting data load...');
        
        // Load main assessment data
        const mainResponse = await fetch('/data/BTEC External Assessment Overview App data with exams.xlsx');
        if (!mainResponse.ok) {
          throw new Error(`Failed to load Excel file: ${mainResponse.status} ${mainResponse.statusText}`);
        }
        const mainArrayBuffer = await mainResponse.arrayBuffer();
        const mainWorkbook = read(mainArrayBuffer, { type: 'array' });
        
        if (!mainWorkbook.SheetNames || mainWorkbook.SheetNames.length === 0) {
          throw new Error('No sheets found in the Excel file');
        }
        
        console.log('Main workbook loaded. Sheets:', mainWorkbook.SheetNames);
        
        let combinedData = [];
        
        // First process all sheets except Summer 25 to get qualification data
        for (const sheetName of mainWorkbook.SheetNames) {
          if (sheetName === 'Summer 25') continue;
          
          console.log(`Processing sheet: ${sheetName}`);
          const worksheet = mainWorkbook.Sheets[sheetName];
          const sheetData = utils.sheet_to_json(worksheet, { header: 1 });
          
          if (sheetData.length < 2) {
            console.log(`Skipping empty sheet: ${sheetName}`);
            continue;
          }
          
          const headerRow = sheetData[0];
          console.log('Header row:', headerRow);
          
          const getColumnIndex = (possibleNames) => {
            const index = headerRow.findIndex(header => {
              if (!header) return false;
              const headerText = header.toString().toLowerCase().trim();
              console.log(`Checking header "${headerText}" against possible names:`, possibleNames);
              return possibleNames.some(name => headerText.includes(name.toLowerCase()));
            });
            console.log(`Looking for columns ${JSON.stringify(possibleNames)}: found at index ${index}`);
            return index;
          };
          
          const indices = {
            qualification: getColumnIndex(['qualification']),
            unitCode: getColumnIndex(['unit code', 'component code', 'examination code', 'code', 'unit', 'component']),
            unitName: getColumnIndex(['unit name', 'component name', 'unit title']),
            sector: getColumnIndex(['sector', 'subject area', 'subject']),
            examType: getColumnIndex(['exam/task', 'task/test', 'exam type', 'assessment type'])
          };
          
          console.log('Column indices:', indices);
          console.log('Header row for reference:', headerRow);
          
          // Skip header row and process data
          for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (!row || row.length === 0) {
              console.log(`Skipping empty row ${i}`);
              continue;
            }
            
            const qualification = String(row[indices.qualification] || '').trim();
            const unitCode = String(row[indices.unitCode] || '').trim();
            const unitName = String(row[indices.unitName] || '').trim();
            const sector = String(row[indices.sector] || '').trim();
            const examType = String(row[indices.examType] || '').trim();
            
            console.log(`Processing row ${i}:`, {
              qualification,
              unitCode,
              unitName,
              sector,
              examType,
              rawRow: row
            });
            
            if (!qualification && !unitCode && !unitName) {
              console.log(`Skipping empty data row ${i}`);
              continue;
            }
            
            // Create a unique key for this assessment
            const key = `${qualification}-${unitCode}-${unitName}`.replace(/\s+/g, '-');
            
            // Add to combined data
            const newItem = {
              key,
              qualification,
              componentCode: unitCode || '',
              componentName: unitName || '',
              sector: sector || '',
              examType: examType || '',
              examDateTime: '' // Will be updated from Summer 25 sheet
            };
            
            console.log('Adding item:', newItem);
            combinedData.push(newItem);
          }
        }
        
        // Then process Summer 25 sheet to get exam dates
        const summer25Sheet = mainWorkbook.Sheets['Summer 25'];
        if (summer25Sheet) {
          console.log('Processing Summer 25 sheet for exam dates');
          const summer25Data = utils.sheet_to_json(summer25Sheet, { header: 1 });
          
          if (summer25Data.length >= 2) {
            const headerRow = summer25Data[0];
            console.log('Summer 25 header row:', headerRow);
            
            const getColumnIndex = (possibleNames) => {
              const index = headerRow.findIndex(header => {
                if (!header) return false;
                const headerText = header.toString().toLowerCase();
                console.log(`Checking header "${headerText}" against:`, possibleNames);
                return possibleNames.some(name => headerText.includes(name.toLowerCase()));
              });
              console.log(`Looking for columns ${JSON.stringify(possibleNames)}: found at index ${index}`);
              return index;
            };
            
            const indices = {
              unitCode: getColumnIndex(['unit code', 'component code', 'examination code', 'code', 'unit', 'component', 'paper code', 'paper']),
              examDate: getColumnIndex(['exam date', 'date']),
              examTime: getColumnIndex(['exam time', 'time']),
              examSeries: getColumnIndex(['exam series', 'series'])
            };
            
            console.log('Summer 25 column indices:', indices);
            
            // Log the first few rows to see what we're working with
            console.log('First few rows of Summer 25 sheet:', summer25Data.slice(0, 5).map(row => ({
              raw: row,
              unitCode: row[indices.unitCode],
              examSeries: row[indices.examSeries]
            })));
            
            // Create a map of unit codes to exam series for faster lookup
            const examSeriesMap = new Map();
            
            // First pass to build the exam series map
            for (let i = 1; i < summer25Data.length; i++) {
              const row = summer25Data[i];
              if (!row || row.length === 0) continue;
              
              const unitCode = String(row[indices.unitCode] || '').trim();
              const examSeries = row[indices.examSeries];
              
              if (unitCode && examSeries) {
                // For RQF BTEC Nationals, we need to handle the format XXXXXТ
                const isRQFCode = /^\d{5}T$/i.test(unitCode);
                const isTechAward = /^B[A-Z]{2}0[23]$/i.test(unitCode); // e.g., BAC03, BCD02
                
                console.log(`Processing row ${i}:`, {
                  unitCode,
                  examSeries,
                  isRQFCode,
                  isTechAward
                });
                
                if (isRQFCode || isTechAward) {
                  let variations = [];
                  
                  if (isRQFCode) {
                    // Store multiple variations for RQF codes
                    const codeWithoutT = unitCode.slice(0, -1);
                    variations = [
                      unitCode,
                      unitCode.toUpperCase(),
                      unitCode.toLowerCase(),
                      codeWithoutT,
                      codeWithoutT.padStart(5, '0'),
                      codeWithoutT + 't',
                      codeWithoutT + 'T',
                      // Add more variations
                      unitCode.replace(/^0+/, ''),  // Remove leading zeros
                      unitCode.replace(/^0+/, '').toLowerCase()
                    ];
                  } else if (isTechAward) {
                    // Store multiple variations for Tech Award codes
                    const baseCode = unitCode.slice(0, -2);  // Remove last 2 digits
                    variations = [
                      unitCode,
                      unitCode.toUpperCase(),
                      unitCode.toLowerCase(),
                      baseCode + '03',
                      baseCode + '02',
                      baseCode,
                      // Add more variations
                      unitCode.replace('03', ''),
                      unitCode.replace('02', ''),
                      baseCode.toLowerCase()
                    ];
                  }
                  
                  console.log(`Adding variations for ${unitCode}:`, {
                    variations,
                    examSeries
                  });
                  
                  variations.forEach(code => {
                    if (code) {
                      examSeriesMap.set(code, String(examSeries).trim());
                      examSeriesMap.set(code.toLowerCase(), String(examSeries).trim());
                    }
                  });
                } else {
                  // Handle other codes as before
                  const normalizedCode = unitCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                  examSeriesMap.set(unitCode, String(examSeries).trim());
                  examSeriesMap.set(normalizedCode, String(examSeries).trim());
                }
              }
            }
            
            console.log('Exam series map contents:', Array.from(examSeriesMap.entries()));
            
            // Then process the rows for all data
            combinedData.forEach(item => {
              const itemCode = item.componentCode;
              if (!itemCode) return;
              
              // Check if this is an RQF code or Tech Award code
              const isRQFCode = /^\d{5}T$/i.test(itemCode);
              const isTechAward = /^B[A-Z]{2}0[23]$/i.test(itemCode);
              
              if (isRQFCode || isTechAward) {
                let variations = [];
                
                if (isRQFCode) {
                  const codeWithoutT = itemCode.slice(0, -1);
                  variations = [
                    itemCode.toUpperCase(),
                    itemCode.toLowerCase(),
                    codeWithoutT,
                    codeWithoutT.padStart(5, '0'),
                    codeWithoutT + 't',
                    codeWithoutT + 'T'
                  ];
                } else if (isTechAward) {
                  variations = [
                    itemCode.toUpperCase(),
                    itemCode.toLowerCase(),
                    itemCode.replace('03', ''),
                    itemCode.replace('02', '')
                  ];
                }
                
                console.log(`Looking for ${isRQFCode ? 'RQF' : 'Tech Award'} code ${itemCode}:`, {
                  variations,
                  hasMatch: variations.some(v => examSeriesMap.has(v)),
                  matchedValue: variations.find(v => examSeriesMap.has(v))
                });
                
                const matchingCode = variations.find(code => examSeriesMap.has(code));
                if (matchingCode) {
                  item.series = examSeriesMap.get(matchingCode);
                }
              } else {
                // Handle other codes as before
                const normalizedCode = itemCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                if (examSeriesMap.has(itemCode)) {
                  item.series = examSeriesMap.get(itemCode);
                } else if (examSeriesMap.has(normalizedCode)) {
                  item.series = examSeriesMap.get(normalizedCode);
                }
              }
            });
          }
        }
        
        console.log('Final combined data:', {
          count: combinedData.length,
          sample: combinedData.slice(0, 3)
        });
        
        if (combinedData.length === 0) {
          console.warn('No data was processed. Check the Excel structure and column names.');
        }
        
        setAssessmentData(combinedData);
        setFilteredData(combinedData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading Excel data:', error);
        setLoading(false);
      }
    };

    loadExcelData();
  }, []);

  // Get unique values for dropdowns
  const getUniqueValues = (field) => {
    return [...new Set(assessmentData.map(item => item[field]))].filter(Boolean).sort();
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      // Apply filters immediately when any filter changes
      applyFilters(newFilters);
      return newFilters;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(filteredData.map(item => item.key));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (key) => {
    setSelectedItems(prev => 
      prev.includes(key)
        ? prev.filter(itemKey => itemKey !== key)
        : [...prev, key]
    );
  };

  const applyFilters = (currentFilters = filters) => {
    let filtered = [...assessmentData];

    // Apply qualification filter
    if (currentFilters.qualification) {
      filtered = filtered.filter(item => 
        item.qualification.toLowerCase() === currentFilters.qualification.toLowerCase()
      );
    }

    // Apply sector filter
    if (currentFilters.sector) {
      filtered = filtered.filter(item => 
        item.sector.toLowerCase() === currentFilters.sector.toLowerCase()
      );
    }

    // Apply exam type filter
    if (currentFilters.examType) {
      filtered = filtered.filter(item => 
        item.examType.toLowerCase() === currentFilters.examType.toLowerCase()
      );
    }

    // Apply search term filter
    if (currentFilters.searchTerm) {
      const searchLower = currentFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(searchLower)
        )
      );
    }

    setFilteredData(filtered);
    setSelectedItems([]);
  };

  const resetFilters = () => {
    const defaultFilters = {
      qualification: '',
      sector: '',
      examType: '',
      searchTerm: ''
    };
    setFilters(defaultFilters);
    setFilteredData(assessmentData);
    setSelectedItems([]);
  };

  const formatQualificationSizes = (sizes) => {
    if (!sizes) return 'N/A';
    // Extract just the size names (Certificate, Extended Certificate, etc.)
    const sizeList = sizes.split(',')
      .map(size => size.trim())
      .filter(size => {
        const lowerSize = size.toLowerCase();
        return lowerSize.includes('certificate') || 
               lowerSize.includes('diploma') || 
               lowerSize.includes('btec nationals') || 
               lowerSize.includes('technical');
      })
      .map(size => {
        // Clean up the size name
        if (size.toLowerCase().includes('extended')) return 'Extended Certificate';
        if (size.toLowerCase().includes('certificate')) return 'Certificate';
        if (size.toLowerCase().includes('diploma')) return 'Diploma';
        return size;
      });
    
    return (
      <div className="qualification-sizes">
        {[...new Set(sizeList)].map((size, index) => (
          <span key={index} className="qualification-size">
            {size}
          </span>
        ))}
      </div>
    );
  };

  const findRelatedPart = (currentItem) => {
    if (!currentItem.part) return null;
    const relatedPart = currentItem.part === 'A' ? 'B' : 'A';
    return assessmentData.find(item => 
      item.componentCode === currentItem.componentCode.replace(/[AB]$/, relatedPart)
    );
  };

  const showDetails = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const navigateToRelatedPart = (relatedItem) => {
    if (relatedItem) {
      showDetails(relatedItem);
    }
  };

  const downloadSelected = () => {
    const selectedData = assessmentData.filter(item => selectedItems.includes(item.key));
    const worksheet = utils.json_to_sheet(selectedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Selected Qualifications');
    writeFile(workbook, 'selected-qualifications.xlsx');
  };

  const getUpcomingAssessments = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return assessmentData
      .filter(item => {
        if (!item.windowStart) return false;
        const assessmentDate = new Date(item.windowStart.split('/').reverse().join('-'));
        return assessmentDate >= today && assessmentDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => {
        const dateA = new Date(a.windowStart.split('/').reverse().join('-'));
        const dateB = new Date(b.windowStart.split('/').reverse().join('-'));
        return dateA - dateB;
      });
  };

  return (
    <div>
      <header>
        <div className="header-content">
          <a href="/" className="logo">
            <img src="/logo.png" alt="Pearson Logo" />
            <span>BTEC External Assessment Overview</span>
          </a>
        </div>
      </header>

      <main>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Search Assessments
          </button>
          <button 
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Assessments
          </button>
        </div>

        {activeTab === 'search' && (
          <>
            <section className="search-section">
              <input
                type="text"
                className="search-input"
                placeholder="Search across all fields..."
                name="searchTerm"
                value={filters.searchTerm}
                onChange={(e) => {
                  handleFilterChange(e);
                }}
              />
            </section>

            <section className="filter-section">
              <div className="filter-section-header">
                <h3>Filter Options</h3>
                <div>
                  <button className="secondary-btn" onClick={resetFilters} style={{ marginRight: '10px' }}>
                    Reset All
                  </button>
                </div>
              </div>
              
              <div className="filter-row">
                <div className="filter-group">
                  <label htmlFor="qualification">Qualification</label>
                  <select
                    id="qualification"
                    name="qualification"
                    value={filters.qualification}
                    onChange={(e) => {
                      handleFilterChange(e);
                    }}
                    className="filter-select"
                  >
                    <option value="">All</option>
                    {getUniqueValues('qualification').map(qual => (
                      <option key={qual} value={qual}>{qual}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="sector">Sector/Subject</label>
                  <select
                    id="sector"
                    name="sector"
                    value={filters.sector}
                    onChange={(e) => {
                      handleFilterChange(e);
                    }}
                    className="filter-select"
                  >
                    <option value="">All Sectors/Subjects</option>
                    {getUniqueValues('sector').map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="exam-type">Exam/Task</label>
                  <select
                    id="exam-type"
                    name="examType"
                    value={filters.examType}
                    onChange={(e) => {
                      handleFilterChange(e);
                    }}
                    className="filter-select"
                  >
                    <option value="">All</option>
                    {getUniqueValues('examType').map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </>
        )}

        <section className="results">
          <div className="results-header">
            <h2>
              {activeTab === 'search' ? 'Search Results' : 'Upcoming Assessments'}
              <span className="results-count">
                ({(activeTab === 'search' ? filteredData : getUpcomingAssessments()).length} {(activeTab === 'search' ? filteredData : getUpcomingAssessments()).length === 1 ? 'result' : 'results'})
              </span>
            </h2>
            {selectedItems.length > 0 && (
              <button className="primary-btn" onClick={downloadSelected}>
                Download Selected ({selectedItems.length})
              </button>
            )}
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedItems.length === (activeTab === 'search' ? filteredData : getUpcomingAssessments()).length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Series</th>
                    <th>Unit Code</th>
                    <th>Unit Name</th>
                    <th>Sector/Subject</th>
                    <th>Release Date</th>
                    <th>Exam Date</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
                      <tr key={`${item.key}-${index}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.key)}
                            onChange={() => handleSelectItem(item.key)}
                          />
                        </td>
                        <td>{item.series || 'N/A'}</td>
                        <td>{item.componentCode || 'N/A'}</td>
                        <td>{item.componentName || 'N/A'}</td>
                        <td>{item.sector || 'N/A'}</td>
                        <td>{item.releaseDate || 'N/A'}</td>
                        <td>{item.examDateTime || 'N/A'}</td>
                        <td>
                          <button className="details-btn" onClick={() => showDetails(item)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr key="no-data">
                      <td colSpan="8" style={{ textAlign: 'center' }}>
                        {loading ? 'Loading...' : 'No data found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {showModal && selectedItem && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Assessment Details</h2>
                <button className="close-btn" onClick={closeModal}>×</button>
              </div>
                <table className="details-table">
                <tbody>
                  <tr>
                    <th>Qualifications</th>
                    <td>{selectedItem.qualification || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Sector/Subject</th>
                    <td>{selectedItem.sector || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Unit Code</th>
                    <td>{selectedItem.componentCode || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Unit Name</th>
                    <td>{selectedItem.componentName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Part</th>
                    <td>
                      {selectedItem.part || 'N/A'}
                      {findRelatedPart(selectedItem) && (
                        <span 
                          className="qualification-link"
                          onClick={() => navigateToRelatedPart(findRelatedPart(selectedItem))}
                        >
                          {' '}(View Part {selectedItem.part === 'A' ? 'B' : 'A'})
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Qualification Sizes</th>
                    <td>{formatQualificationSizes(selectedItem.qualificationSizes)}</td>
                  </tr>
                  <tr>
                    <th>Release Date</th>
                    <td>{selectedItem.releaseDate || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Window Start</th>
                    <td>{selectedItem.windowStart || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Window End</th>
                    <td>{selectedItem.windowEnd || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Submission Deadline</th>
                    <td>{selectedItem.submissionDeadline || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Duration</th>
                    <td>{selectedItem.duration || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Access Arrangements</th>
                    <td>{selectedItem.access || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Level of Control</th>
                    <td>{selectedItem.levelOfControl || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Invigilator</th>
                    <td>{selectedItem.invigilator || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Additional Information</th>
                    <td>{selectedItem.additionalInfo || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'upcoming' && (
          <section className="results">
            <div className="results-header">
              <h2>
                Upcoming Assessments (Next 30 Days)
                <span className="results-count">
                  ({getUpcomingAssessments().length} {getUpcomingAssessments().length === 1 ? 'assessment' : 'assessments'})
                </span>
              </h2>
            </div>
            <div className="table-container">
              {loading ? (
                <div className="loading">Loading...</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedItems.length === getUpcomingAssessments().length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Series</th>
                      <th>Unit Code</th>
                      <th>Unit Name</th>
                      <th>Sector/Subject</th>
                      <th>Release Date</th>
                      <th>Exam Date</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getUpcomingAssessments().map((item) => (
                      <tr key={item.key}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.key)}
                            onChange={() => handleSelectItem(item.key)}
                          />
                        </td>
                        <td>{item.series || 'N/A'}</td>
                        <td>{item.componentCode || 'N/A'}</td>
                        <td>{item.componentName || 'N/A'}</td>
                        <td>{item.sector || 'N/A'}</td>
                        <td>{item.releaseDate || 'N/A'}</td>
                        <td>{item.windowStart || 'N/A'}</td>
                        <td>
                          <button className="details-btn" onClick={() => showDetails(item)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App; 