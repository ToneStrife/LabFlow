import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRequestById } from '@/lib/requests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

const RequestView = () => {
  const { id } = useParams();

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['request', id],
    queryFn: () => getRequestById(id!),
    enabled: !!id,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching request</div>;
  if (!request) return <div>Request not found</div>;

  // Function to generate a public URL for a file path
  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Request Details</span>
            <Badge>{request.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Subject</h3>
            <p>{request.subject}</p>
          </div>
          <div>
            <h3 className="font-semibold">Description</h3>
            <p>{request.description}</p>
          </div>
          <div>
            <h3 className="font-semibold">Requester</h3>
            <p>{request.requester_name} ({request.requester_email})</p>
          </div>
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold">Attachments</h3>
              <ul className="list-disc list-inside">
                {request.attachments.map((attachment: any) => (
                  <li key={attachment.id}>
                    <a
                      href={getPublicUrl(attachment.file_path)} // Use the public URL
                      target="_blank" // Open in a new tab
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {attachment.file_name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestView;