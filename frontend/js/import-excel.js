import XLSX from 'xlsx';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'crm'
};

const excelFile = 'C:\\Users\\admin\\Downloads\\Team Report _ Funding Sathi (6).xlsx';

function excelDateToDate(excelDate) {
  if (!excelDate || excelDate === 0) return null;
  try {
    // Excel uses days since 1/1/1900, JavaScript uses milliseconds since 1/1/1970
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

async function importData() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const wb = XLSX.readFile(excelFile);

    // Import SOD REPORT
    console.log('Importing SOD REPORT...');
    const sodSheet = wb.Sheets['SOD REPORT'];
    const sodData = XLSX.utils.sheet_to_json(sodSheet);
    for (const row of sodData) {
      const dateVal = excelDateToDate(row.Date);
      const [result] = await connection.execute(
        `INSERT INTO sod_reports (timestamp, email, date_col, sales_executive_name, territory_region, target_for_today, focus_industry, support_needed, remarks, ai_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.Timestamp || null, row['Email Address'] || null, dateVal, row['Sales Executive Name'] || null, row['Territory / Region'] || null, row['Target for Today (₹/Units)'] || null, row['Focus Industry/Segment'] || null, row['Support Needed (Yes/No + Details)'] || null, row.Remarks || null, row['AI Score'] || null]
      );
    }
    console.log(`✅ SOD REPORT: ${sodData.length} rows imported`);

    // Import EOD REPORT
    console.log('Importing EOD REPORT...');
    const eodSheet = wb.Sheets['EOD REPORT'];
    const eodData = XLSX.utils.sheet_to_json(eodSheet);
    for (const row of eodData) {
      const dateVal = excelDateToDate(row.Date);
      await connection.execute(
        `INSERT INTO eod_reports (timestamp, email, date_col, sales_executive_name, calls_made, meetings_held, key_clients, deals_moved, challenges_faced, learnings, remarks, ai_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.Timestamp || null, row['Email Address'] || null, dateVal, row['Sales Executive Name'] || null, row['Number of Calls Made'] || null, row['Number of Meetings Held'] || null, row['Key Clients Spoken To'] || null, row['Deals Moved to Next Stage (Yes/No + Value ₹)'] || null, row['Challenges Faced'] || null, row.Learnings || null, row.Remarks || null, row['AI Score'] || null]
      );
    }
    console.log(`✅ EOD REPORT: ${eodData.length} rows imported`);

    // Import Report History
    console.log('Importing Report History...');
    const historySheet = wb.Sheets['ReportHistory'];
    const historyData = XLSX.utils.sheet_to_json(historySheet);
    for (const row of historyData) {
      await connection.execute(
        `INSERT INTO report_history (date_time, email, sales_executive_name, target_leads, meetings_planned)
         VALUES (?, ?, ?, ?, ?)`,
        [row['Date Time'] || null, row.Email || null, row['Sales Executive Name'] || null, row['Target for Today  (Leads)'] || null, row['Key Meetings Planned (Client Name + Time)'] || null]
      );
    }
    console.log(`✅ Report History: ${historyData.length} rows imported`);

    // Import Leads
    console.log('Importing Leads...');
    const leadsSheet = wb.Sheets['Leadzz Journey FS'];
    const leadsData = XLSX.utils.sheet_to_json(leadsSheet);
    for (const row of leadsData) {
      const dateOfEntry = excelDateToDate(row['Date of Entry '] || row['Column 1']);
      const dateOfFirstCall = excelDateToDate(row['Date of First Call  ']);
      const nextFollowup = excelDateToDate(row['Next Follow-up Date  ']);
      
      await connection.execute(
        `INSERT INTO leads (entry_timestamp, email, date_of_entry, lead_source, company_name, contact_person, designation, contact_number, email_id, location, date_of_first_call, purpose_of_call, product_service, call_outcome, current_status, proposal_shared, next_followup)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row['Column 1'] || null, row['Email Address'] || null, dateOfEntry, row['  Lead Source  '] || null, row['  Customer Company Name  '] || null, row['Contact Person Name  '] || null, row['Designation  '] || null, row['Contact Number  '] || null, row['Email ID  '] || null, row['Location (City, State)  '] || null, dateOfFirstCall, row['Purpose of Call  '] || null, row['Product/Service Discussed  '] || null, row['Call Outcome  '] || null, row['Current Status of Lead  '] || null, row['Proposal/Document Shared?  Yes / No  (If Yes, Mention Date)  '] || null, nextFollowup]
      );
    }
    console.log(`✅ Leads: ${leadsData.length} rows imported`);

    // Add sample users
    console.log('Adding sample users...');
    const users = [
      ['admin@example.com', 'Admin User', 'admin'],
      ['manager@example.com', 'Manager User', 'manager'],
      ['akshayborge647@gmail.com', 'Akshay Borge', 'sales_executive'],
      ['khansaleem232003@gmail.com', 'Saleem Khan', 'sales_executive']
    ];
    for (const [email, name, role] of users) {
      await connection.execute(
        `INSERT IGNORE INTO users (email, name, role) VALUES (?, ?, ?)`,
        [email, name, role]
      );
    }
    console.log(`✅ Users: ${users.length} users added`);

    console.log('\n✅ IMPORT COMPLETE!');
    console.log(`Total records: SOD(${sodData.length}) + EOD(${eodData.length}) + History(${historyData.length}) + Leads(${leadsData.length}) = ${sodData.length + eodData.length + historyData.length + leadsData.length}`);

    await connection.end();
  } catch (err) {
    console.error('ERROR:', err.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

importData();
