'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Printer, Send, FileDown, Loader2, Trash2, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import type { FormData } from './QuoteForm';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { getVexurProducts } from '@/ai/flows/get-vexur-products-flow';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';


const parentescos = [
    { value: "AGREGADO", label: "Agregado" },
    { value: "BISNETO", label: "Bisneto" },
    { value: "COMPANHEIRO(A)", label: "Companheiro(a)" },
    { value: "CURATELADO(A)", label: "Curatelado(a)" },
    { value: "CONJUGE", label: "Cônjuge" },
    { value: "ENTEADO(A)", label: "Enteado(a)" },
    { value: "FILHO(A)", label: "Filho(a)" },
    { value: "FILHO(A)_INVALIDO(A)", label: "Filho(a) inválido(a)" },
    { value: "GENRO/NORA", label: "Genro/Nora" },
    { value: "IRMAOS", label: "Irmãos" },
    { value: "MENOR_SOB_GUARDA", label: "Menor sob guarda" },
    { value: "MAE", label: "Mãe" },
    { value: "NETO(A)", label: "Neto(a)" },
    { value: "OUTROS", label: "Outros" },
    { value: "PAI", label: "Pai" },
    { value: "SOBRINHO(A)", label: "Sobrinho(a)" },
    { value: "SOGRO(A)", label: "Sogro(a)" },
    { value: "TIO(A)", label: "Tio(a)" },
    { value: "TUTELADO(A)", label: "Tutelado(a)" },
];

const dependentSchema = z.object({
  birthDate: z.date({ required_error: "A data de nascimento é obrigatória." }),
  sexo: z.string({ required_error: "Selecione o sexo." }),
  parentesco: z.string({ required_error: "Selecione o parentesco." }),
  estadoCivil: z.string({ required_error: "Selecione o estado civil." }),
});

type DependentFormData = z.infer<typeof dependentSchema>;


const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
        return 'N/A';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getPlanTags = (plan: any) => {
    const tags = [];
    if (plan.tipoContratacaoProduto) tags.push(plan.tipoContratacaoProduto.toUpperCase());
    if (plan.padraoAcomodacaoProduto && plan.padraoAcomodacaoProduto !== 'Não se aplica') tags.push(plan.padraoAcomodacaoProduto.toUpperCase());
    if (plan.abrangenciaAtendimentoProduto) tags.push(plan.abrangenciaAtendimentoProduto.toUpperCase());
    if (plan.coparticipacao) tags.push('COM COPARTICIPAÇÃO');
    else tags.push('SEM COPARTICIPAÇÃO');
    return tags;
}

interface SimulationResultProps {
    onGoBack: () => void;
    formData: (FormData & { quoteId: string }) | null;
    results: any[];
}

const calculateAge = (birthDate: Date | string | undefined): number => {
    if (!birthDate) return 0;
    const bd = new Date(birthDate);
    if (isNaN(bd.getTime())) return 0; // Invalid date
    
    let age = new Date().getFullYear() - bd.getFullYear();
    const m = new Date().getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < bd.getDate())) {
        age--;
    }
    return age;
};

export function SimulationResult({ onGoBack, formData: initialFormData, results: initialResults }: SimulationResultProps) {
    const [currentFormData, setCurrentFormData] = useState(initialFormData);
    const [currentResults, setCurrentResults] = useState(initialResults);
    const [isReSimulating, setIsReSimulating] = useState(false);
    
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', description: '' });
    const [isWhatsAppAlertOpen, setIsWhatsAppAlertOpen] = useState(false);
    const [clientPhoneNumber, setClientPhoneNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingDependent, setIsAddingDependent] = useState(false);
    const [hasSimulated, setHasSimulated] = useState(true); // Start as true since we are on this screen


    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const entityName = currentResults?.[0]?.conveniado?.nomeFantasia || initialFormData?.entity || 'Entidade não informada';

    const dependentForm = useForm<DependentFormData>({
        resolver: zodResolver(dependentSchema),
        defaultValues: {
            birthDate: new Date(),
            sexo: 'FEMININO',
            parentesco: 'FILHO(A)',
            estadoCivil: 'SOLTEIRO(A)',
        },
    });

    useEffect(() => {
        if (initialFormData?.phoneNumber) {
            setClientPhoneNumber(initialFormData.phoneNumber);
        }
    }, [initialFormData]);

    useEffect(() => {
        // Only select the first plan if no plan is currently selected
        if (currentResults && currentResults.length > 0 && !selectedPlanId) {
            const firstPlan = currentResults.filter(plan => plan?.faturas?.[0]?.id)[0];
            if (firstPlan) {
                // Use a composite ID to ensure uniqueness even if multiple plans share the same ID
                const firstPlanId = `${firstPlan.faturas[0].id.toString()}::0`;
                setSelectedPlanId(firstPlanId);
            }
        } else if (!currentResults || currentResults.length === 0) {
            setSelectedPlanId(undefined);
        }
    }, [currentResults]);
    
    const runReSimulation = async (updatedData: FormData & { quoteId: string }) => {
        console.log("1. [FRONTEND] - RE-SIMULANDO. Dados do formulário:", updatedData);
        setIsReSimulating(true);
        try {
            const proponentes = [
                {
                    uuid: uuidv4(),
                    parentesco: "TITULAR",
                    dataNascimento: new Date(updatedData.birthDate).getTime(),
                    cpf: "768.883.090-70",
                    sexo: updatedData.sexo,
                    estadoCivil: updatedData.estadoCivil,
                    profissao: updatedData.profession,
                },
                ...(updatedData.dependents || []).map(dep => ({
                    uuid: uuidv4(),
                    parentesco: dep.parentesco,
                    dataNascimento: new Date(dep.birthDate).getTime(),
                    sexo: dep.sexo,
                    estadoCivil: dep.estadoCivil,
                }))
            ];

            const payload = {
                filtros: {
                    origemProposta: "Venda fácil",
                    tipoProduto: "COLETIVO" as const,
                    tipoContratacaoProduto: "Adesão" as const,
                    conveniados: [parseInt(updatedData.entity, 10)],
                    EhCorretor: true,
                    EhEmpresarial: false,
                    localidade: {
                        uf: updatedData.state,
                        municipio: updatedData.city,
                    },
                    corretor: { id: 21218, nome: "Jaqueline Agra", email: "jaqueline.agra@qvsaude.com.br", cpf: "072.663.657-67", praca: "RJ", estrutura: "2021 0001 0002", tipoCorretor: "PESSOA FÍSICA" },
                    proponentes: proponentes,
                }
            };
            
            console.log("2. [FRONTEND] - Payload final a ser enviado para o backend (Re-simulação):", JSON.stringify(payload, null, 2));
            console.log("3. [FRONTEND] - Chamando a função do backend 'getVexurProducts' (Re-simulação)...");
            const newResults = await getVexurProducts(payload);
            console.log("4. [FRONTEND] - Resultados recebidos do backend (Re-simulação):", newResults);
            
            setCurrentResults(newResults || []);

            if (newResults && newResults.length > 0) {
                toast({
                    title: "Busca atualizada!",
                    description: `Encontrados ${newResults.length} novos planos.`,
                });
            } else {
                 toast({
                    variant: "default",
                    title: "Nenhum plano encontrado",
                    description: "A busca foi atualizada, mas nenhum plano corresponde aos filtros atuais.",
                });
            }
        } catch (error) {
            console.error("Erro ao re-simular:", error);
            toast({ variant: "destructive", title: "Erro ao buscar novos planos.", description: "Por favor, tente novamente." });
            setCurrentResults([]);
        } finally {
            setIsReSimulating(false);
        }
    };

    const handleAddDependent = (newDependent: DependentFormData) => {
        if (!currentFormData) return;
    
        const updatedDependents = [...(currentFormData.dependents || []), newDependent];
    
        const updatedFormData = {
            ...currentFormData,
            dependents: updatedDependents,
            hasDependents: 'sim' as const,
        };
    
        setCurrentFormData(updatedFormData);
        if (hasSimulated) {
          runReSimulation(updatedFormData);
        }
        setIsAddingDependent(false);
        dependentForm.reset();
    };
    
    const handleRemoveDependent = (indexToRemove: number) => {
        if (!currentFormData) return;
        
        const updatedDependents = currentFormData.dependents?.filter((_, index) => index !== indexToRemove) ?? [];
        const updatedFormData = { ...currentFormData, dependents: updatedDependents };
        
        setCurrentFormData(updatedFormData);
        if (hasSimulated) {
            runReSimulation(updatedFormData);
        }
    };

    const showSelectionRequiredAlert = () => {
        setAlertConfig({
            title: 'Nenhum plano selecionado',
            description: 'Por favor, selecione um plano para continuar.',
        });
        setIsAlertOpen(true);
    };

    const saveQuoteAndGetLink = async (): Promise<string | null> => {
        if (!selectedPlanId || !currentFormData || !user || !firestore) {
            let description = 'Por favor, selecione um plano para continuar.';
            if (!user) {
                description = 'A autenticação do usuário falhou. Por favor, tente recarregar a página.';
            } else if (!firestore) {
                description = 'A conexão com o banco de dados não está disponível.';
            } else if (!currentFormData) {
                description = 'Os dados do formulário foram perdidos. Por favor, tente novamente.';
            }
            setAlertConfig({
                title: 'Não é possível continuar',
                description: description,
            });
            setIsAlertOpen(true);
            return null;
        }

        setIsSaving(true);
        
        const selectedPlanIndex = selectedPlanId ? parseInt(selectedPlanId.split('::')[1], 10) : -1;
        const selectedPlan = selectedPlanIndex >= 0 ? currentResults[selectedPlanIndex] : undefined;

        if (!selectedPlan) {
            console.error("Plano selecionado não foi encontrado ou tem estrutura inválida nos resultados.");
            setAlertConfig({
                title: 'Erro ao Processar',
                description: 'O plano selecionado não pôde ser processado. Por favor, selecione outro plano.',
            });
            setIsAlertOpen(true);
            setIsSaving(false);
            return null;
        }

        const planTags = getPlanTags(selectedPlan);

        const quoteData = {
            creatorId: user.uid,
            fullName: currentFormData?.fullName || 'N/A',
            phoneNumber: currentFormData?.phoneNumber || '',
            email: currentFormData?.email || '',
            age: calculateAge(currentFormData?.birthDate),
            cityState: `${currentFormData?.city || 'N/A'}, ${currentFormData?.state || 'N/A'}`,
            professionName: currentFormData?.profession || 'N/A',
            entityName: selectedPlan.conveniado?.nomeFantasia || 'N/A',
            birthDate: currentFormData?.birthDate ? new Date(currentFormData.birthDate).toISOString() : new Date().toISOString(),
            effectiveDate: currentFormData?.effectiveDate ? new Date(currentFormData.effectiveDate).toISOString() : new Date().toISOString(),
            hasDependents: currentFormData?.hasDependents || 'nao',
            timestamp: new Date().toISOString(),
            plan: {
                operator: selectedPlan.fornecedor?.nomeFantasia?.split(' - ')[0] || 'N/A',
                name: selectedPlan.nomeAmigavelProduto || selectedPlan.nomeProdutoNoRegulador,
                beneficiaries: (currentFormData?.dependents?.length || 0) + 1,
                total: selectedPlan.faturas?.[0]?.valores?.[0]?.valorVenda,
                tags: planTags,
                ansCode: selectedPlan.codigoProdutoNoRegulador,
            },
        };

        try {
            const quotesCollection = collection(firestore, 'quotes');
            
            // Create a timeout promise to prevent infinite loading
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Tempo limite excedido ao salvar cotação.")), 15000)
            );

            const docRef = await Promise.race([
                addDocumentNonBlocking(quotesCollection, quoteData),
                timeoutPromise
            ]) as any;

            if (!docRef || !docRef.id) throw new Error("A referência do documento não foi retornada após salvar.");
            
            return `${window.location.origin}/cotacao/view?id=${docRef.id}`;
        } catch (error: any) {
            console.error("Erro ao salvar cotação no Firestore: ", error);
            const details = (error && typeof error.message === 'string') ? error.message : 'Não foi possível salvar sua cotação no banco de dados.';
            setAlertConfig({
                title: 'Erro ao Salvar',
                description: details,
            });
            setIsAlertOpen(true);
            return null;
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAction = async (action: 'print' | 'pdf' | 'whatsapp') => {
        if (isSaving || !currentFormData) return;
        
        // 1. Open window immediately to avoid popup blocker (for print/pdf/whatsapp)
        let newWindow: Window | null = null;
        if (action === 'print' || action === 'pdf' || action === 'whatsapp') {
             newWindow = window.open('', '_blank');
             if (newWindow) {
                 const title = action === 'whatsapp' ? 'Abrindo WhatsApp...' : 'Gerando...';
                 const message = action === 'whatsapp' ? 'Preparando mensagem para o WhatsApp...' : 'Gerando seu documento...';
                 newWindow.document.write(`<html><head><title>${title}</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background-color:#f9fafb;"><div style="text-align:center;padding:20px;"><h3>${message}</h3><p style="color:#6b7280;">Por favor, aguarde enquanto preparamos sua cotação.</p></div></body></html>`);
             } else {
                 toast({ variant: "destructive", title: "Pop-up bloqueado", description: "Permita pop-ups para continuar." });
                 return;
             }
        }

        const quoteLink = await saveQuoteAndGetLink();
        
        if (!quoteLink) {
            if (newWindow) newWindow.close();
            return;
        }

        if (action === 'print' || action === 'pdf') {
            if (newWindow) {
                newWindow.location.href = quoteLink;
                // For print, we rely on the user printing from the new page, 
                // or we can try to trigger it if the new page allows.
                if (action === 'print') {
                    newWindow.onload = () => {
                         setTimeout(() => newWindow?.print(), 1000);
                    };
                }
            }
        } else if (action === 'whatsapp') {
             const selectedPlanIndex = selectedPlanId ? parseInt(selectedPlanId.split('::')[1], 10) : -1;
             const selectedPlan = selectedPlanIndex >= 0 ? currentResults[selectedPlanIndex] : undefined;

             if (!selectedPlan) {
                 toast({ variant: 'destructive', title: 'Erro', description: 'Plano selecionado não encontrado para envio.' });
                 return;
             }
             let message = `Olá ${currentFormData?.fullName}, segue sua cotação de plano de saúde:\n\n`;
             message += `*Operadora:* ${selectedPlan.fornecedor?.nomeFantasia?.split(' - ')[0] || 'N/A'}\n`;
             message += `*Plano:* ${selectedPlan.nomeAmigavelProduto || selectedPlan.nomeProdutoNoRegulador}\n`;
             message += `*Valor:* ${formatCurrency(selectedPlan.faturas?.[0]?.valores?.[0]?.valorVenda)}\n\n`;
             message += `Para ver todos os detalhes e gerar seu PDF, acesse o link:\n${quoteLink}\n\n`;
             message += `Qualquer dúvida, estou à disposição.`;
             
             const whatsappUrl = `https://wa.me/${clientPhoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
             
             if (newWindow) {
                 newWindow.location.href = whatsappUrl;
             } else {
                 window.open(whatsappUrl, '_blank');
             }
        }
    }
    
    const handleSendWhatsApp = () => {
        if (!selectedPlanId) {
            showSelectionRequiredAlert();
            return;
        }
        setIsWhatsAppAlertOpen(true);
    }
    
    const confirmSendWhatsApp = () => {
        setIsWhatsAppAlertOpen(false);
        handleAction('whatsapp');
    }

    const ActionButton = ({ onClick, children, ...props }: React.ComponentProps<typeof Button>) => (
        <Button onClick={onClick} disabled={isSaving || isReSimulating} {...props}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
        </Button>
    );

    return (
        <div className="w-full">
             <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Simulação de Planos</CardTitle>
                    <CardDescription>
                       Planos encontrados para a entidade: <span className="font-semibold text-foreground">{entityName}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                        <h4 className="font-semibold text-muted-foreground">Resumo da Simulação</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-bold uppercase text-muted-foreground">Titular</p>
                                <p className="font-medium">{currentFormData?.fullName}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-muted-foreground">Idade</p>
                                <p className="font-medium">{currentFormData ? `${calculateAge(currentFormData.birthDate)} anos` : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-muted-foreground">Beneficiários</p>
                                <p className="font-medium">{(currentFormData?.dependents?.length || 0) + 1}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-muted-foreground">Local</p>
                                <p className="font-medium">{currentFormData?.city}, {currentFormData?.state}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-b pb-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-muted-foreground">Dependentes na simulação:</h4>
                            {!isAddingDependent && (
                                <Button variant="outline" size="sm" disabled={isReSimulating} onClick={() => setIsAddingDependent(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Adicionar Dependente
                                </Button>
                            )}
                        </div>

                        {currentFormData?.dependents && currentFormData.dependents.length > 0 ? (
                             <div className="space-y-2">
                                {currentFormData.dependents.map((dep, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md animate-in fade-in-0">
                                        <span className="text-sm font-medium">Dependente #{index + 1} ({dep.parentesco}) - {calculateAge(dep.birthDate)} anos</span>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveDependent(index)} disabled={isReSimulating}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                            <span className="sr-only">Remover dependente</span>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            !isAddingDependent && <p className="text-sm text-muted-foreground text-center py-2">Nenhum dependente adicionado.</p>
                        )}

                        {isAddingDependent && (
                             <Card className="p-4 animate-in fade-in-0">
                                <h4 className="font-semibold text-foreground mb-4">Adicionar Novo Dependente</h4>
                                <Form {...dependentForm}>
                                    <form id="add-dependent-form" onSubmit={dependentForm.handleSubmit(handleAddDependent)} className="space-y-4">
                                        <FormField
                                            control={dependentForm.control}
                                            name="birthDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Data de Nascimento</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>DD/MM/AAAA</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" variant="idade" selected={field.value} onSelect={field.onChange} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField
                                                control={dependentForm.control}
                                                name="sexo"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Sexo</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="MASCULINO">Masculino</SelectItem>
                                                                <SelectItem value="FEMININO">Feminino</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={dependentForm.control}
                                                name="parentesco"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Parentesco</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {parentescos.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={dependentForm.control}
                                                name="estadoCivil"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Estado Civil</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="SOLTEIRO(A)">Solteiro(a)</SelectItem>
                                                                <SelectItem value="CASADO(A)">Casado(a)</SelectItem>
                                                                <SelectItem value="DIVORCIADO(A)">Divorciado(a)</SelectItem>
                                                                <SelectItem value="VIUVO(A)">Viúvo(a)</SelectItem>
                                                                <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                                                                <SelectItem value="NAO_INFORMADO">Não Informar</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </form>
                                </Form>
                                 <div className="flex justify-end gap-2 mt-4">
                                    <Button type="button" variant="ghost" onClick={() => setIsAddingDependent(false)}>Cancelar</Button>
                                    <Button type="submit" form="add-dependent-form" disabled={isReSimulating}>
                                        {isReSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Adicionar e Simular"}
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>

                    {isReSimulating ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-3 text-muted-foreground">Buscando novos planos...</p>
                        </div>
                    ) : currentResults && currentResults.length > 0 ? (
                        <RadioGroup value={selectedPlanId} onValueChange={setSelectedPlanId} className="space-y-4">
                            {currentResults
                                .filter(plan => plan?.faturas?.[0]?.id)
                                .map((plan, index) => {
                                const planId = plan.faturas[0].id.toString();
                                const uniqueId = `${planId}::${index}`;
                                const isSelected = selectedPlanId === uniqueId;
                                const planValue = plan.faturas[0]?.valores?.[0]?.valorVenda;
                                const tags = getPlanTags(plan);

                                return (
                                    <Card 
                                        key={uniqueId}
                                        className={`overflow-hidden relative cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary' : ''}`}
                                        onClick={() => setSelectedPlanId(uniqueId)}
                                    >
                                        {index === 0 && (
                                            <Badge className="absolute top-4 right-4 bg-amber-400 text-amber-900 hover:bg-amber-500">
                                                ⭐ Recomendado
                                            </Badge>
                                        )}
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <RadioGroupItem value={uniqueId} id={`plan-${uniqueId}`} />
                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-lg pr-24">{plan.nomeAmigavelProduto || plan.nomeProdutoNoRegulador}</h3>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Valor total:</p>
                                                        <p className="font-bold text-lg">{formatCurrency(planValue)}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">ANS {plan.codigoProdutoNoRegulador}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Operadora:</p>
                                                        <p className="font-semibold">{plan.fornecedor?.nomeFantasia?.split(' - ')[0]}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </RadioGroup>
                    ) : (
                         <div className="text-center py-10">
                            <p className="font-semibold text-lg">Nenhum plano foi encontrado.</p>
                            <p className="text-muted-foreground text-sm">
                                {currentFormData?.dependents && currentFormData.dependents.length > 0
                                ? "Tente remover um dependente para realizar uma nova busca."
                                : "Tente voltar e alterar os dados da simulação."}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
            <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-4">
                <Button variant="outline" onClick={onGoBack} disabled={isReSimulating}>Voltar e Editar Dados</Button>
                <div className="flex items-center gap-2">
                    <ActionButton variant="outline" onClick={() => handleAction('print')}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </ActionButton>
                     <ActionButton variant="outline" onClick={() => handleAction('pdf')}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Gerar PDF
                    </ActionButton>
                    <ActionButton onClick={handleSendWhatsApp} className="bg-green-500 hover:bg-green-600 text-white">
                        <Send className="mr-2 h-4 w-4" />
                        Enviar para WhatsApp
                    </ActionButton>
                </div>
            </div>
            
            {/* General Purpose Alert */}
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertConfig.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setIsAlertOpen(false)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* WhatsApp Confirmation Alert */}
            <AlertDialog open={isWhatsAppAlertOpen} onOpenChange={setIsWhatsAppAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Enviar Cotação por WhatsApp</AlertDialogTitle>
                        <AlertDialogDescription>
                            Confirme o número de telefone do cliente para enviar a cotação.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="whatsapp-number">Número do WhatsApp do Cliente</Label>
                        <Input
                            id="whatsapp-number"
                            value={clientPhoneNumber}
                            onChange={(e) => setClientPhoneNumber(e.target.value)}
                            placeholder="(XX) XXXXX-XXXX"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmSendWhatsApp} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enviar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
