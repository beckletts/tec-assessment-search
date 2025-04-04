# BTEC Assessment Search Tool

A React-based web application for searching and managing BTEC External Assessments. This tool allows users to:

- Search through BTEC qualifications and assessments
- Filter by sector and exam type
- View upcoming assessments
- View detailed information about each assessment
- Download selected assessments as Excel files

## Features

- Search functionality across all fields
- Filter options for sectors and exam types
- Upcoming assessments view showing next 5 assessments
- Detailed view for each assessment
- Excel export functionality
- Responsive design

## Setup

1. Clone the repository:
```bash
git clone [your-repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Dependencies

- React
- xlsx (for Excel file handling)
- Other dependencies as specified in package.json

## Data

The application uses an Excel file ("BTEC External Assessment Overview.xlsx") as its data source. Place this file in the `public/data` directory. 