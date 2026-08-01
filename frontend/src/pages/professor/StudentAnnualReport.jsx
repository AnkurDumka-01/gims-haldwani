import { useParams } from 'react-router-dom';
import AnnualReportView from '../../components/AnnualReportView';

export default function StudentAnnualReport() {
  const { id } = useParams();
  return (
    <AnnualReportView
      summaryUrl={`/professor/students/${id}/attendance-summary`}
      pdfUrl={`/professor/students/${id}/attendance-summary/pdf`}
      backTo="/professor"
    />
  );
}
