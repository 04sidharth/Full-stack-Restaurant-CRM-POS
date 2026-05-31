import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const StubPage = ({ title, description }: { title: string; description: string }) => (
  <div className="container py-8">
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This module is part of the upcoming build phase. The foundation (auth, schema, tenancy) is in place,
        so the API + UI for this feature will plug in here next.
      </CardContent>
    </Card>
  </div>
);
