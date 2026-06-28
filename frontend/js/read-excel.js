import XLSX from 'xlsx';
const filePath = 'C:\\Users\\admin\\Downloads\\Team Report _ Funding Sathi (6).xlsx';

try {
  const wb = XLSX.readFile(filePath);
  console.log('=== EXCEL STRUCTURE ===');
  console.log('SHEETS:', JSON.stringify(wb.SheetNames, null, 2));
  
  wb.SheetNames.forEach(sheet => {
    const ws = wb.Sheets[sheet];
    const data = XLSX.utils.sheet_to_json(ws);
    console.log(`\n=== SHEET: ${sheet} ===`);
    if (data.length > 0) {
      console.log('COLUMNS:', Object.keys(data[0]));
      console.log('TOTAL ROWS:', data.length);
      console.log('FIRST ROW:');
      console.log(JSON.stringify(data[0], null, 2));
      if (data.length > 1) {
        console.log('SECOND ROW:');
        console.log(JSON.stringify(data[1], null, 2));
      }
    }
  });
} catch (err) {
  console.error('ERROR:', err.message);
}
