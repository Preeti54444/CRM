import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelFile = 'c:\\Users\\DELL\\Downloads\\Team Report _ Funding Sathi (1).xlsx';

console.log('Reading Excel file:', excelFile);

try {
  const workbook = XLSX.readFile(excelFile);
  
  console.log('\n=== WORKBOOK STRUCTURE ===');
  console.log('Sheet names:', workbook.SheetNames);
  
  workbook.SheetNames.forEach((sheetName, idx) => {
    console.log(`\n--- Sheet ${idx + 1}: "${sheetName}" ---`);
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Total rows: ${data.length}`);
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      console.log('First row:', JSON.stringify(data[0], null, 2));
      if (data.length > 1) {
        console.log('Second row:', JSON.stringify(data[1], null, 2));
      }
    }
    
    // Save to JSON for inspection
    const jsonFile = path.join(process.cwd(), `sheet-${idx}-${sheetName.replace(/\s+/g, '_')}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
    console.log(`Saved to: ${jsonFile}`);
  });
  
} catch (err) {
  console.error('Error reading Excel file:', err.message);
}
