import type { ComponentType } from 'react';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { RedirectIfAuthenticated, RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './components/layout/AppLayout';

/** Carrega páginas sob demanda para reduzir o pacote inicial. */
function lazyPage<M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M) {
  return async () => ({ Component: (await loader())[name] as ComponentType });
}

const router = createBrowserRouter([
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
          { path: '/', element: <DashboardPage /> },
          { path: '/produtos', lazy: lazyPage(() => import('./features/products/ProductsPage'), 'ProductsPage') },
          {
            path: '/produtos/novo',
            lazy: lazyPage(() => import('./features/products/ProductFormPages'), 'NewProductPage'),
          },
          {
            path: '/produtos/:id',
            lazy: lazyPage(() => import('./features/products/ProductDetailPage'), 'ProductDetailPage'),
          },
          {
            path: '/produtos/:id/editar',
            lazy: lazyPage(() => import('./features/products/ProductFormPages'), 'EditProductPage'),
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
          { path: '*', lazy: lazyPage(() => import('./features/NotFoundPage'), 'NotFoundPage') },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
