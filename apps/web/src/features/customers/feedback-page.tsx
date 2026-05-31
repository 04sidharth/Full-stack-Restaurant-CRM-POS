import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star } from 'lucide-react';
import { customersApi } from './customers-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const FeedbackPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['feedback'], queryFn: customersApi.listFeedback });

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/customers')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Customer feedback</h1>
      <p className="mb-6 text-muted-foreground">All feedback your customers have submitted.</p>

      <Card>
        <CardContent className="space-y-3 p-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            data.map((f) => (
              <div key={f.id} className="rounded-md border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm">
                      {f.customer ? f.customer.name ?? f.customer.phone : 'Anonymous'}
                      {f.order && <span className="text-muted-foreground"> · Order #{f.order.orderNumber}</span>}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleString()}</span>
                </div>
                {f.comment && <p className="text-sm">{f.comment}</p>}
                <div className="mt-1 text-xs text-muted-foreground">
                  {f.foodRating !== null && <span>Food: {f.foodRating}/5 </span>}
                  {f.serviceRating !== null && <span>· Service: {f.serviceRating}/5</span>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
