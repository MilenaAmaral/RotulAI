import type { ComponentType } from 'react';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from './auth/RequireAuth';
import { AppLayout } from './components/layout/AppLayout';
import { PublicCatalogLayout } from './features/public-catalog/PublicCatalogLayout';

/** Carrega páginas sob demanda para reduzir o pacote inicial. */
function lazyPage<M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M) {
  return async () => ({ Component: (await loader())[name] as ComponentType });
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicCatalogLayout />,
    children: [
      {
        index: true,
        lazy: lazyPage(() => import('./features/public-catalog/LandingPage'), 'LandingPage'),
      },
    ],
  },
  {
    path: '/catalogo',
    element: <PublicCatalogLayout />,
    children: [
      {
        index: true,
        lazy: lazyPage(() => import('./features/public-catalog/PublicProductsPage'), 'PublicProductsPage'),
      },
      {
        path: 'produtos/:slug',
        lazy: lazyPage(() => import('./features/public-catalog/PublicProductPage'), 'PublicProductPage'),
      },
      {
        path: 'ingredientes',
        lazy: lazyPage(() => import('./features/public-catalog/PublicIngredientsPage'), 'PublicIngredientsPage'),
      },
      {
        path: 'ingredientes/:id',
        lazy: lazyPage(() => import('./features/public-catalog/PublicIngredientPage'), 'PublicIngredientPage'),
      },
    ],
  },
  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: '/entrar', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/produtos', lazy: lazyPage(() => import('./features/favorites/FavoritesPage'), 'FavoritesPage') },
          { path: '/favoritos', lazy: lazyPage(() => import('./features/favorites/FavoritesPage'), 'FavoritesPage') },
          {
            path: '/produtos/:id',
            lazy: lazyPage(() => import('./features/products/ProductDetailPage'), 'ProductDetailPage'),
          },
          {
            path: '/ingredientes',
            lazy: lazyPage(() => import('./features/ingredients/IngredientsPage'), 'IngredientsPage'),
          },
          {
            path: '/ingredientes/consultas/:id',
            lazy: lazyPage(() => import('./features/ingredients/AnalysisPage'), 'AnalysisPage'),
          },
          {
            path: '/ingredientes/:id',
            lazy: lazyPage(() => import('./features/ingredients/IngredientDetailPage'), 'IngredientDetailPage'),
          },
          { path: '/comparar', lazy: lazyPage(() => import('./features/compare/ComparePage'), 'ComparePage') },
          {
            path: '/comparar/:id',
            lazy: lazyPage(() => import('./features/compare/ComparisonPage'), 'ComparisonPage'),
          },
          { path: '/assistente', lazy: lazyPage(() => import('./features/assistant/AssistantPage'), 'AssistantPage') },
          {
            path: '/assistente/:id',
            lazy: lazyPage(() => import('./features/assistant/AssistantPage'), 'AssistantPage'),
          },
          { path: '/historico', lazy: lazyPage(() => import('./features/history/HistoryPage'), 'HistoryPage') },
          { path: '/conta', lazy: lazyPage(() => import('./features/account/AccountPage'), 'AccountPage') },
          {
            element: <RequireRole role="ADMIN" />,
            children: [{ path: '/admin', lazy: lazyPage(() => import('./features/admin/AdminPage'), 'AdminPage') }],
          },
          { path: '*', lazy: lazyPage(() => import('./features/NotFoundPage'), 'NotFoundPage') },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
