import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/States';
import { AuthLayout } from './AuthLayout';
import type { RegisterForm } from './schemas';
import { registerFormSchema } from './schemas';

export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerFormSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await createAccount(values.name, values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setSubmitError(error);
    }
  });

  return (
    <AuthLayout title="Criar conta" subtitle="Cadastre seus produtos e consulte ingredientes em um só lugar.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {submitError !== null && <ErrorState error={submitError} />}
        <TextField label="Nome" autoComplete="name" error={errors.name?.message} {...register('name')} />
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
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres, com letras e números."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          Criar conta
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Já tem conta?{' '}
        <Link
          to="/entrar"
          className="font-semibold text-graphite underline decoration-brand-accent decoration-2 underline-offset-4"
        >
          Entrar
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
