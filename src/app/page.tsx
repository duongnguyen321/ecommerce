'use client';
import Loading from '@/components/Loading';
import { ThemeSwitch } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <>
      <ThemeSwitch />
      <Loading />
    </>
  );
}
