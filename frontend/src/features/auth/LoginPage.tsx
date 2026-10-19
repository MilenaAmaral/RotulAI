import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/States';
import { AuthLayout } from './AuthLayout';
import type { LoginForm } from './schemas';
import { loginFormSchema } from './schemas';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema) });

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (error) {
      setSubmitError(error);
    }
  });

  return (
    <AuthLayout title="Entrar" subtitle="Acesse seu catálogo de cosméticos e suas consultas.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {submitError !== null && <ErrorState error={submitError} />}
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Ainda não tem conta?{' '}
        <Link
          to="/cadastro"
          className="font-semibold text-graphite underline decoration-brand-accent decoration-2 underline-offset-4"
        >
          Criar conta
        </Link>
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        Quer apenas consultar?{' '}
        <Link
          to="/catalogo"
          className="font-semibold text-graphite underline decoration-brand-accent decoration-2 underline-offset-4"
        >
          Ver catálogo público
        </Link>
      </p>
    </AuthLayout>
  );
}
