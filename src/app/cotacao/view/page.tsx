'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QVIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface QuoteDetails {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string;
    age: number;
    cityState: string;
    professionName: string;
    entityName: string;
    birthDate: string; 
    effectiveDate: string;
    hasDependents: string;
    timestamp: string;
    plan: {
        operator: string;
        name: string;
        beneficiaries: number;
        total: number;
        tags: string[];
        ansCode: string;
    }
}

// Helper to format currency
const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
        return 'N/A';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function QuoteDetailsPageContent() {
    const searchParams = useSearchParams();
    const quoteId = searchParams.get('id');
    const firestore = useFirestore();

    const quoteRef = useMemoFirebase(() => {
        if (!quoteId || !firestore) return null;
        return doc(firestore, 'quotes', quoteId);
    }, [firestore, quoteId]);
    
    const { data: quote, isLoading, error: docError } = useDoc<QuoteDetails>(quoteRef);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!quoteId) {
            setError("ID da cotação não fornecido no link.");
        }
        if (docError) {
            console.error("Erro ao buscar cotação do Firestore:", docError);
            setError("Não foi possível carregar os detalhes da cotação. Verifique se o link é válido.");
        }
    }, [quoteId, docError]);

    const handlePrint = () => {
        window.print();
    };

    const InfoItem = ({ label, value, isHighlighted, className }: { label: string; value: string | number | undefined | null, isHighlighted?: boolean, className?: string }) => (
        <div className={className}>
            <p className="text-xs text-muted-foreground font-semibold">{label}</p>
            <p className={`font-bold break-words ${isHighlighted ? 'text-primary' : 'text-foreground'}`}>{value || 'N/A'}</p>
        </div>
    );
    
    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        try {
            // Firestore timestamp might be ISO string
            return format(parseISO(dateString), 'dd/MM/yyyy');
        } catch (e) {
            return 'Data inválida';
        }
    }
    
    const formatTimestamp = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        try {
            return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch (e) {
            return 'Data inválida';
        }
    }

    if (isLoading || (!quote && !error)) {
        return (
             <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-100 p-4">
                <Card className="w-full max-w-md shadow-lg rounded-2xl p-8">
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4 mt-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error || !quote) {
         return (
             <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-100 p-4">
                <Card className="w-full max-w-md shadow-lg rounded-2xl p-8 text-center">
                    <CardHeader>
                        <CardTitle className="text-destructive">Erro ao Carregar Cotação</CardTitle>
                        <CardDescription>{error || "Cotação não encontrada."}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="bg-gray-100 font-sans">
            <div className="w-full max-w-md mx-auto bg-card shadow-lg print:shadow-none">
                <header className="text-center py-4 space-y-2 border-b">
                    <QVIcon className="mx-auto size-12"/>
                    <h1 className="font-bold text-primary">Detalhe da sua cotação</h1>
                </header>

                <main className="p-4 md:p-6 space-y-6">
                    {/* Plan Details */}
                    <section className="bg-primary text-primary-foreground rounded-lg p-4 space-y-3">
                        <div>
                            <p className="text-xs opacity-80">OPERADORA:</p>
                            <h2 className="font-bold text-lg">{quote?.plan?.operator}</h2>
                        </div>
                        <div>
                            <p className="text-xs opacity-80">PLANO:</p>
                            <p className="font-bold">{quote?.plan?.name}</p>
                        </div>
                        <div className="flex justify-between items-center">
                             <div>
                                <p className="text-xs opacity-80">QTD DE BENEFICIÁRIOS:</p>
                                <p className="font-bold">{quote?.plan?.beneficiaries}</p>
                            </div>
                            <div>
                                <p className="text-xs opacity-80 text-right">TOTAL:</p>
                                <p className="font-bold text-lg text-right">{formatCurrency(quote?.plan?.total)}</p>
                            </div>
                        </div>
                        <div className="border-t border-primary-foreground/20 pt-3">
                             <div className="flex flex-wrap gap-2 mb-2">
                                {quote?.plan?.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">{tag}</Badge>
                                ))}
                            </div>
                            <p className="text-xs opacity-80">ANS {quote?.plan?.ansCode}</p>
                        </div>
                    </section>
                    
                    {/* Holder Details */}
                    <section className="space-y-4">
                        <h3 className="font-bold text-lg">{quote?.fullName} (Titular)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoItem label="IDADE" value={`${quote?.age} ANOS`} isHighlighted />
                            <InfoItem label="TELEFONE CELULAR" value={quote?.phoneNumber} isHighlighted />
                            <InfoItem label="E-MAIL" value={quote?.email || 'Não informado'} isHighlighted className="col-span-2" />
                            <InfoItem label="PROFISSÃO" value={quote?.professionName} isHighlighted />
                            <InfoItem label="PREÇO" value={formatCurrency(quote?.plan?.total)} isHighlighted />
                        </div>
                    </section>
                    
                    {/* Basic Info */}
                    <section className="space-y-4 pt-4 border-t">
                         <h3 className="font-bold text-primary">INFORMAÇÕES BÁSICAS</h3>
                         <div className="grid grid-cols-2 gap-4">
                             <InfoItem label="DATA DA COTAÇÃO" value={formatTimestamp(quote?.timestamp)} />
                             <InfoItem label="MÊS DE REAJUSTE" value="JULHO" />
                             <InfoItem label="ENTIDADE" value={quote?.entityName} />
                             <InfoItem label="ÁREA DE ATUAÇÃO DO PLANO" value={quote?.plan?.tags.find(t => t === 'ESTADUAL' || t === 'NACIONAL') || quote?.cityState.split(', ')[1]} />
                             <InfoItem label="DATA DA VIGÊNCIA" value={formatDate(quote?.effectiveDate)} />
                         </div>
                    </section>

                    {/* Disclaimer */}
                    <section className="text-xs text-muted-foreground text-center italic">
                        <p>Atenção: Estas condições são válidas para contratação do plano na vigência {formatDate(quote?.effectiveDate)}. Para verificar os valores em outras vigências, solicite uma nova simulação ao seu(ua) corretor(a).</p>
                    </section>
                </main>
                <footer className="text-center py-4 border-t print:hidden">
                    <div className="mb-4 px-6">
                        <Button onClick={handlePrint} className="w-full">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir ou Salvar PDF
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">um produto: QV</p>
                </footer>
            </div>
        </div>
    );
}

export default function CotacaoResultPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <QuoteDetailsPageContent />
        </Suspense>
    )
}
