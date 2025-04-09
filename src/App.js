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
        const response = await fetch('/data/BTEC External Assessment Overview.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = read(arrayBuffer);
        
        let combinedData = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = utils.sheet_to_json(worksheet);
          
          sheetData.forEach(row => {
            if (row.Qualification || row.qualification) {
              // Extract series and part from component code if available
              const componentCode = row['Component Code'] || row['Component\nCode'] || '';
              const seriesMatch = componentCode.match(/^([A-Z]+)/);
              const partMatch = componentCode.match(/([A-Z])$/);
              
              combinedData.push({
                id: combinedData.length + 1,
                sheet: sheetName,
                qualification: row.Qualification || row.qualification || '',
                sector: row.Sector || row.Subject || row.sector || '',
                componentCode: componentCode,
                componentName: row['Component Name'] || row.Title || row['Component/Unit Name'] || '',
                examType: row['Exam/Task'] || row['Task/Test'] || row['Assessment Type'] || '',
                series: seriesMatch ? seriesMatch[1] : '',
                part: partMatch ? partMatch[1] : '',
                duration: row.Duration || row['Duration (hours)'] || '',
                access: row.Access || row['Access Arrangement'] || '',
                levelOfControl: row['Level of control'] || '',
                additionalInfo: row['Additional information'] || row.Notes || '',
                invigilator: row['Internal/External invigilator required'] || row['Invigilator Type'] || '',
                qualificationSizes: row['Qualification Sizes\n(Double click to expand cell to see all qualifications)'] || row['Qualification Sizes'] || '',
                releaseDate: formatDate(row['Release Date']),
                windowStart: formatDate(row['Window start'] || row['Start Date']),
                windowEnd: formatDate(row['Window end'] || row['End Date']),
                submissionDeadline: formatDate(row['Submission deadline'] || row.Deadline)
              });
            }
          });
        });

        setAssessmentData(combinedData);
        setFilteredData(combinedData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading Excel file:', err);
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
      setSelectedItems(filteredData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
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
    const sizeList = sizes.split(',').map(size => size.trim());
    return (
      <div className="qualification-sizes">
        {sizeList.map((size, index) => (
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
    const selectedData = assessmentData.filter(item => selectedItems.includes(item.id));
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
                    <th>Part</th>
                    <th>Unit Code</th>
                    <th>Unit Name</th>
                    <th>Sector/Subject</th>
                    <th>Release Date</th>
                    <th>Exam Date</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'search' ? filteredData : getUpcomingAssessments()).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                        />
                      </td>
                      <td>{item.series || 'N/A'}</td>
                      <td>{item.part || 'N/A'}</td>
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
                    <th>Qualification</th>
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
                      <th>Part</th>
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
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                          />
                        </td>
                        <td>{item.series || 'N/A'}</td>
                        <td>{item.part || 'N/A'}</td>
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