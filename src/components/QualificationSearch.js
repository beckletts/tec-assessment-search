import React from 'react';
import {
  TextField,
  InputAdornment,
  Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

function QualificationSearch({ searchTerm, setSearchTerm }) {
  return (
    <Box>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search qualifications..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
}

export default QualificationSearch; 