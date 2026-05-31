import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoriesTab } from './categories-tab';
import { ItemsTab } from './items-tab';
import { ModifierGroupsTab } from './modifier-groups-tab';

export const MenuPage = () => (
  <div className="container py-8">
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">Menu</h1>
      <p className="text-muted-foreground">Manage your categories, items, and modifier groups.</p>
    </div>
    <Tabs defaultValue="items">
      <TabsList>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
      </TabsList>
      <TabsContent value="items">
        <ItemsTab />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesTab />
      </TabsContent>
      <TabsContent value="modifiers">
        <ModifierGroupsTab />
      </TabsContent>
    </Tabs>
  </div>
);
