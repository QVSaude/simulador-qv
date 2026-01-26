'use client';
import React from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileText, Link as LinkIcon, MoreHorizontal } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ClientOnly } from '@/components/ClientOnly';

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function QuotesPage() {
  const firestore = useFirestore();

  const quotesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'quotes');
  }, [firestore]);

  const { data: quotes, isLoading, error } = useCollection(quotesQuery);

  const renderContent = () => {
    if (isLoading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-8 w-8" />
                <span>Erro ao carregar as cotações.</span>
                <span className="text-xs text-muted-foreground">{error.message}</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }
    
    if (!quotes || quotes.length === 0) {
        return (
             <TableBody>
                <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8" />
                        <span>Nenhuma cotação salva encontrada.</span>
                        <span className="text-xs">
                            As cotações salvas aparecerão aqui.
                        </span>
                    </div>
                </TableCell>
                </TableRow>
            </TableBody>
        )
    }

    return (
        <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">{quote.fullName}</TableCell>
                <TableCell>{quote.phoneNumber}</TableCell>
                <TableCell>{quote.age} anos</TableCell>
                <TableCell>{quote.professionName}</TableCell>
                <TableCell><Badge variant="outline">{quote.plan.name}</Badge></TableCell>
                <TableCell className="font-semibold">{formatCurrency(quote.plan.total)}</TableCell>
                <TableCell>
                  <ClientOnly>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/cotacao/view?id=${quote.id}`} target="_blank">
                               <LinkIcon className="mr-2 h-4 w-4" /> Ver Link da Cotação
                            </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ClientOnly>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
    )

  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cotações Adesão</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Profissão</TableHead>
              <TableHead>Plano Simulado</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          {renderContent()}
        </Table>
      </CardContent>
    </Card>
  );
}
