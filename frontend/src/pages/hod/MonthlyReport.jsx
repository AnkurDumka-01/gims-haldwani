import MonthlyReportView from '../../components/MonthlyReportView';

export default function MonthlyReport() {
  return <MonthlyReportView baseUrl="/hod" departmentSelectable={false} />;
}
