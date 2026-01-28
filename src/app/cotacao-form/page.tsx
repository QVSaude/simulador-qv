'use client';

import Link from 'next/link';
import { QuoteForm, type FormData } from '@/components/QuoteForm';
import { SimulationResult } from '@/components/SimulationResult';
import { Button } from '@/components/ui/button';
import { LifeBuoy, Briefcase, Users, HeartPulse } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="absolute top-0 left-0 right-0 py-4 px-8 md:px-12 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/cotacao-form" className="text-2xl font-bold text-primary">
          QV Saúde
        </Link>
        <div>
          {isUserLoading ? (
            <Skeleton className="h-9 w-28" />
          ) : user && !user.isAnonymous ? (
            <Button variant="ghost" onClick={handleLogout}>Sair</Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Feature({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
                <div className="p-3 bg-accent/10 rounded-full">
                    <Icon className="w-6 h-6 text-accent" />
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}


export default function Home() {
  const [showSimulations, setShowSimulations] = useState(false);
  const [formData, setFormData] = useState<(FormData & { quoteId: string }) | null>(null);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If auth has loaded and there's no user, or the user is anonymous, redirect to login.
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSimulationRequest = (data: FormData & { quoteId: string }, results: any[]) => {
    setFormData(data);
    setSimulationResults(results);
    setShowSimulations(true);
  };

  const handleGoBack = () => {
    setShowSimulations(false);
    // Removed: setFormData(null);
    setSimulationResults([]);
  };

  // While auth is resolving, or if user is not a logged-in broker, show a loading screen.
  if (isUserLoading || !user || user.isAnonymous) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <p>Carregando...</p>
        </div>
    );
  }
  
  if (showSimulations) {
    return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
            <SimulationResult onGoBack={handleGoBack} formData={formData} results={simulationResults} />
        </div>
       </div>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gray-50">
        <div className="flex flex-col justify-center items-start p-8 md:p-16">
          <div className="max-w-md space-y-6">
            <h1 className="text-5xl font-bold text-foreground leading-tight">
              Cote seu Plano de Saúde em Minutos
            </h1>
            <p className="text-lg text-muted-foreground">
              Preencha o formulário e receba uma cotação personalizada
              diretamente no seu WhatsApp. Simples, rápido e sem compromisso.
            </p>
            <div className="space-y-8 pt-4">
                <Feature 
                    icon={HeartPulse} 
                    title="Planos Individuais"
                    description="Encontre o plano de saúde perfeito para você com a melhor cobertura."
                />
                <Feature 
                    icon={Users} 
                    title="Planos Familiares"
                    description="Proteja quem você ama com um plano completo para toda a família."
                />
                <Feature 
                    icon={Briefcase} 
                    title="Planos Empresariais"
                    description="Ofereça os melhores benefícios para seus colaboradores com condições especiais."
                />
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center p-4 md:p-8 bg-gray-100">
           <div className="w-full max-w-lg">
            <QuoteForm onSimulate={handleSimulationRequest} initialData={formData} />
           </div>
        </div>
      </main>
    </>
  );
}