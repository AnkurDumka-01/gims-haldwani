import { useParams } from 'react-router-dom';
import AnnualReportView from '../../components/AnnualReportView';

export default function StudentAnnualReport() {
  const { id } = useParams();
  return (
    <AnnualReportView
      summaryUrl={`/admin/students/${id}/attendance-summary`}
      pdfUrl={`/admin/students/${id}/attendance-summary/pdf`}
      backTo="/admin/students"
    />
  );
}
