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
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { read, utils, writeFile } from 'xlsx';

function QualificationList({ searchTerm, selectedQualifications, onQualificationSelect }) {
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadExcelData = async () => {
      try {
        const response = await fetch('/data/BTEC External Assessment Overview.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = read(arrayBuffer);
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = utils.sheet_to_json(worksheet);
        
        // Transform the data to include IDs
        const transformedData = jsonData.map((row, index) => ({
          id: index + 1,
          ...row
        }));
        
        setQualifications(transformedData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading Excel file:', err);
        setError('Failed to load qualification data');
        setLoading(false);
      }
    };

    loadExcelData();
  }, []);

  const filteredQualifications = qualifications.filter(qual => {
    const searchLower = searchTerm.toLowerCase();
    // Search through all fields of the qualification
    return Object.values(qual).some(value => 
      value && value.toString().toLowerCase().includes(searchLower)
    );
  });

  const handleDownload = () => {
    const selectedData = qualifications.filter(qual =>
      selectedQualifications.includes(qual.id)
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
      <Box sx={{ p: 2 }}>
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
        {filteredQualifications.map((qualification) => (
          <ListItem
            key={qualification.id}
            dense
            button
            onClick={() => onQualificationSelect(qualification.id)}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={selectedQualifications.includes(qualification.id)}
                tabIndex={-1}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText
              primary={Object.entries(qualification)
                .filter(([key]) => key !== 'id')
                .map(([key, value]) => `${key}: ${value}`)
                .join(' | ')}
            />
          </ListItem>
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