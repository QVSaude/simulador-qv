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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import proposalsData from '@/lib/proposals.json';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClientOnly } from '@/components/ClientOnly';

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Emitida: 'default',
  Pendente: 'secondary',
  Paga: 'outline',
  Cancelada: 'destructive',
};

export default function ProposalsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Propostas Adesão</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proposta</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposalsData.map((proposal) => (
              <TableRow key={proposal.id}>
                <TableCell className="font-medium">{proposal.id}</TableCell>
                <TableCell>{proposal.clientName}</TableCell>
                <TableCell>{proposal.cpf}</TableCell>
                <TableCell>{proposal.plan}</TableCell>
                <TableCell>
                   <Badge variant={statusVariant[proposal.status] || 'secondary'}>
                    {proposal.status}
                  </Badge>
                </TableCell>
                <TableCell>{proposal.broker}</TableCell>
                <TableCell>{proposal.submissionDate}</TableCell>
                <TableCell>{proposal.value}</TableCell>
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
                        <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Cancelar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ClientOnly>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
