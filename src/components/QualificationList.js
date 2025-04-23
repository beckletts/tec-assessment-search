import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Button,
  Box,
  Typography,
  CircularProgress,
  Collapse,
  IconButton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { read, utils, writeFile } from 'xlsx';

function QualificationList({ searchTerm, selectedQualifications, onQualificationSelect }) {
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    const loadExcelData = async () => {
      try {
        setLoading(true);
        
        // Load main assessment data
        const mainResponse = await fetch('/data/btec-external-assessment-overview.xlsx');
        const mainArrayBuffer = await mainResponse.arrayBuffer();
        const mainWorkbook = read(mainArrayBuffer);
        
        let combinedData = [];
        
        // Process main workbook
        mainWorkbook.SheetNames.forEach(sheetName => {
          const worksheet = mainWorkbook.Sheets[sheetName];
          const sheetData = utils.sheet_to_json(worksheet);
          
          sheetData.forEach(row => {
            if (row.Qualification || row.qualification) {
              const qualification = row.Qualification || row.qualification;
              const sector = row.Sector || row.sector || '';
              const examType = row['Exam Type'] || row['examType'] || '';
              const date = row.Date || row.date;
              
              // Create a unique key for this assessment
              const key = `${qualification}-${sector}-${examType}-${date}`;
              
              combinedData.push({
                key,
                qualification,
                sector,
                examType,
                date: formatDate(date),
                rawDate: date,
                additionalInfo: row
              });
            }
          });
        });
        
        // Load and merge additional data files
        try {
          const summerResponse = await fetch('/data/BTEC-Summer-2025-Final-Timetable.xlsx');
          const summerArrayBuffer = await summerResponse.arrayBuffer();
          const summerWorkbook = read(summerArrayBuffer);
          
          // Process summer workbook and merge with main data
          summerWorkbook.SheetNames.forEach(sheetName => {
            const worksheet = summerWorkbook.Sheets[sheetName];
            const sheetData = utils.sheet_to_json(worksheet);
            
            sheetData.forEach(row => {
              if (row.Qualification || row.qualification) {
                const qualification = row.Qualification || row.qualification;
                const sector = row.Sector || row.sector || '';
                const examType = row['Exam Type'] || row['examType'] || '';
                const date = row.Date || row.date;
                
                const key = `${qualification}-${sector}-${examType}-${date}`;
                
                // Find matching entry in combinedData
                const existingEntry = combinedData.find(item => item.key === key);
                if (existingEntry) {
                  // Merge additional information
                  existingEntry.additionalInfo = {
                    ...existingEntry.additionalInfo,
                    ...row,
                    season: 'Summer 2025'
                  };
                } else {
                  // Add new entry if not found
                  combinedData.push({
                    key,
                    qualification,
                    sector,
                    examType,
                    date: formatDate(date),
                    rawDate: date,
                    additionalInfo: {
                      ...row,
                      season: 'Summer 2025'
                    }
                  });
                }
              }
            });
          });

          // Load winter timetable
          const winterResponse = await fetch('/data/btec-winter-2025-final-timetable.xlsx');
          const winterArrayBuffer = await winterResponse.arrayBuffer();
          const winterWorkbook = read(winterArrayBuffer);
          
          // Process winter workbook and merge with main data
          winterWorkbook.SheetNames.forEach(sheetName => {
            const worksheet = winterWorkbook.Sheets[sheetName];
            const sheetData = utils.sheet_to_json(worksheet);
            
            sheetData.forEach(row => {
              if (row.Qualification || row.qualification) {
                const qualification = row.Qualification || row.qualification;
                const sector = row.Sector || row.sector || '';
                const examType = row['Exam Type'] || row['examType'] || '';
                const date = row.Date || row.date;
                
                const key = `${qualification}-${sector}-${examType}-${date}`;
                
                // Find matching entry in combinedData
                const existingEntry = combinedData.find(item => item.key === key);
                if (existingEntry) {
                  // Merge additional information
                  existingEntry.additionalInfo = {
                    ...existingEntry.additionalInfo,
                    ...row,
                    season: 'Winter 2025'
                  };
                } else {
                  // Add new entry if not found
                  combinedData.push({
                    key,
                    qualification,
                    sector,
                    examType,
                    date: formatDate(date),
                    rawDate: date,
                    additionalInfo: {
                      ...row,
                      season: 'Winter 2025'
                    }
                  });
                }
              }
            });
          });
        } catch (error) {
          console.warn('Could not load additional assessment timetables:', error);
        }
        
        setQualifications(combinedData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading Excel data:', error);
        setError('Failed to load qualification data');
        setLoading(false);
      }
    };

    loadExcelData();
  }, []);

  const handleToggle = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatDate = (serialNumber) => {
    if (!serialNumber) return '';
    try {
      const epoch = new Date(1899, 11, 30);
      const offsetDays = serialNumber;
      const resultDate = new Date(epoch.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      return resultDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return serialNumber;
    }
  };

  const filteredQualifications = qualifications.filter(qual =>
    qual.qualification.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = () => {
    const selectedData = qualifications.filter(qual =>
      selectedQualifications.includes(qual.qualification)
    );

    const worksheet = utils.json_to_sheet(selectedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Selected Qualifications');
    
    writeFile(workbook, 'selected-qualifications.xlsx');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Available Qualifications</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          disabled={selectedQualifications.length === 0}
          onClick={handleDownload}
        >
          Download Selected ({selectedQualifications.length})
        </Button>
      </Box>

      <List>
        {filteredQualifications.map((qual) => (
          <React.Fragment key={qual.key}>
            <ListItem
              button
              onClick={() => handleToggle(qual.key)}
              sx={{
                borderBottom: '1px solid #eee',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedQualifications.includes(qual.qualification)}
                  onChange={(e) => onQualificationSelect(e, qual.qualification)}
                  onClick={(e) => e.stopPropagation()}
                />
              </ListItemIcon>
              <ListItemText
                primary={qual.qualification}
                secondary={`${qual.sector} - ${qual.examType} (${qual.date})`}
              />
              <IconButton edge="end" onClick={(e) => {
                e.stopPropagation();
                handleToggle(qual.key);
              }}>
                {expandedItems[qual.key] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </ListItem>
            <Collapse in={expandedItems[qual.key]} timeout="auto" unmountOnExit>
              <Box p={2} sx={{ backgroundColor: '#f9f9f9' }}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Additional Information:</strong>
                </Typography>
                {Object.entries(qual.additionalInfo).map(([key, value]) => (
                  key !== 'qualification' && key !== 'sector' && key !== 'examType' && key !== 'date' && (
                    <Typography key={key} variant="body2" color="textSecondary">
                      <strong>{key}:</strong> {value}
                    </Typography>
                  )
                ))}
              </Box>
            </Collapse>
          </React.Fragment>
        ))}
        {filteredQualifications.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No qualifications found matching your search.
          </Typography>
        )}
      </List>
    </Box>
  );
}

export default QualificationList; 