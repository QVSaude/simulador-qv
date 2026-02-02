"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { useAuth, useUser } from '@/firebase';


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import statesData from "@/lib/brazil-states-cities.json";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { getVexurProducts } from "@/ai/flows/get-vexur-products-flow";
import { getVexurEntities } from "@/ai/flows/get-vexur-entities-flow";
import { useToast } from "@/hooks/use-toast";
import { getVexurProfessions } from "@/ai/flows/getVexurProfessions";


interface State {
  name: string;
  uf: string;
  cities: string[];
}

interface Profession {
  id: number;
  descricao: string;
}

interface Entity {
  id: number;
  nomeFantasia: string;
  razaoSocial?: string;
}

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


const formSchema = z.object({
  fullName: z.string().min(1, "O nome completo é obrigatório."),
  phoneNumber: z.string().min(10, "O número de telefone é obrigatório."),
  email: z.string().email("Formato de e-mail inválido.").or(z.literal("")).optional(),
  sexo: z.string({ required_error: "Selecione o sexo." }),
  estadoCivil: z.string({ required_error: "Selecione o estado civil." }),
  state: z.string({ required_error: "Informe o estado." }),
  city: z.string({ required_error: "Informe o município." }),
  profession: z.string({ required_error: "Selecione a profissão." }),
  entity: z.string({ required_error: "Selecione a entidade." }),
  birthDate: z.date({
    required_error: "A data de nascimento é obrigatória.",
  }),
  effectiveDate: z.date({
    required_error: "A data de vigência é obrigatória.",
  }),
  hasDependents: z.enum(["nao", "sim"], {
    required_error: "Selecione se deseja adicionar dependentes.",
  }),
  dependents: z.array(z.object({
    birthDate: z.date({ required_error: "A data de nascimento é obrigatória." }),
    sexo: z.string({ required_error: "Selecione o sexo." }),
    parentesco: z.string({ required_error: "Selecione o parentesco." }),
    estadoCivil: z.string({ required_error: "Selecione o estado civil." }),
  })).optional(),
  hasCnpj: z.boolean().default(false),
  numberOfPeople: z.coerce.number().optional(),
});

export type FormData = z.infer<typeof formSchema>;

interface QuoteFormProps {
  onSimulate: (data: FormData & { quoteId: string }, results: any[]) => void;
  initialData?: FormData | null; // Added prop
}

function DateInput({ value, onChange }: { value?: Date; onChange: (date: Date | undefined) => void }) {
  const [inputValue, setInputValue] = React.useState("");
  
  // Sync input with external value changes (e.g. from Calendar)
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd/MM/yyyy"));
    } else if (inputValue && inputValue.length === 10 && isValid(parse(inputValue, "dd/MM/yyyy", new Date()))) {
       setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    
    let formatted = val;
    if (val.length >= 5) {
      formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length >= 3) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    
    setInputValue(formatted);

    if (formatted.length === 10) {
      const parsed = parse(formatted, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
      } else {
        onChange(undefined);
      }
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="flex gap-2">
      <Input value={inputValue} onChange={handleInputChange} placeholder="DD/MM/AAAA" maxLength={10} />
      <Popover>
        {/* Calendar Trigger */}
      </Popover>
    </div>
  );
}

export function QuoteForm({ onSimulate, initialData }: QuoteFormProps) {
  const [selectedState, setSelectedState] = React.useState<State | null>(null);
  const [professions, setProfessions] = React.useState<Profession[]>([]);
  const [filteredEntities, setFilteredEntities] = React.useState<Entity[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingEntities, setLoadingEntities] = React.useState(false);
  const { toast } = useToast();

  const states: State[] = statesData.states;

  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      fullName: "",
      phoneNumber: "",
      email: "",
      hasDependents: "nao",
      dependents: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dependents",
  });

  const hasDependentsValue = form.watch("hasDependents");

  const runSimulation = React.useCallback(async (data: FormData) => {
    console.log("1. [FRONTEND] - Dados do formulário para simulação:", data);
    setLoading(true);

    try {
        const proponentes = [
            {
                uuid: uuidv4(),
                parentesco: "TITULAR",
                dataNascimento: data.birthDate.getTime(),
                cpf: "768.883.090-70",
                sexo: data.sexo,
                estadoCivil: data.estadoCivil,
                profissao: data.profession.toUpperCase(),
            },
            ...(data.dependents || []).map(dep => ({
                uuid: uuidv4(),
                parentesco: dep.parentesco,
                dataNascimento: dep.birthDate.getTime(),
                sexo: dep.sexo,
                estadoCivil: dep.estadoCivil,
            }))
        ];

        const payload = {
            filtros: {
                origemProposta: "Venda fácil",
                tipoProduto: "COLETIVO" as const,
                tipoContratacaoProduto: "Adesão" as const,
                conveniados: [parseInt(data.entity)],
                EhCorretor: true,
                EhEmpresarial: false,
                localidade: {
                    uf: data.state,
                    municipio: data.city.toUpperCase(),
                },
                corretor: {
                    id: 21217,
                    nome: "Suporte Vexur",
                    email: "suporte@vexur.com.br",
                    cpf: "026.301.040-60",
                    praca: "SP",
                    estrutura: "2021 0001 0001",
                    tipoCorretor: "PESSOA FÍSICA"
                },
                proponentes: proponentes,
            }
        };

        console.log("2. [FRONTEND] - Payload final a ser enviado para o backend:", JSON.stringify(payload, null, 2));
        
        console.log("3. [FRONTEND] - Chamando a função do backend 'getVexurProducts'...");
        const results = await getVexurProducts(payload);
        console.log("4. [FRONTEND] - Resultados recebidos do backend dos produtos:", results);
        
        const quoteId = uuidv4();
        onSimulate({ ...data, quoteId }, results);

    } catch (error) {
        console.error("ERRO NO FRONTEND ao chamar a API:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        toast({
            variant: "destructive",
            title: "Erro ao buscar planos.",
            description: `Detalhe: ${errorMessage}. Verifique o console para mais informações.`,
        });
        const quoteId = uuidv4();
        onSimulate({ ...data, quoteId }, []); 
    } finally {
      setLoading(false);
    }
  }, [onSimulate, toast, user]);

  const onSubmit = React.useCallback(async (data: FormData) => {
    await runSimulation(data);
  }, [runSimulation]);


  React.useEffect(() => {
    async function loadProfessions() {
      try {
        setLoading(true);
        console.log("[FRONTEND] Carregando profissões...");
        const data = await getVexurProfessions(); 
        console.log("[FRONTEND] Profissões recebidas:", data);

        const formatted: Profession[] = data.map((descricao, index) => ({
          id: index + 1,
          descricao,
        }));

        setProfessions(formatted);
      } catch (error) {
        console.error("Erro ao carregar profissões:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar as profissões.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfessions();
  }, []);



  const handleStateChange = (uf: string) => {
    const state = states.find((s) => s.uf === uf) || null;
    setSelectedState(state);
    form.setValue("state", uf);
    form.resetField("city");
  };

  const handleCityChange = (city: string) => {
    form.setValue("city", city);
  };

  const fetchEntities = async (professionDesc: string, data: FormData) => {
    setLoadingEntities(true);
    try {
      const proponentes = [];
      // Add titular
      if (data.birthDate && data.sexo && data.estadoCivil) {
          proponentes.push({
              uuid: uuidv4(),
              parentesco: "TITULAR",
              dataNascimento: data.birthDate.getTime(),
              sexo: data.sexo,
              estadoCivil: data.estadoCivil,
              profissao: professionDesc,
              cpf: "768.883.090-70",
          });
      }
      
      // Add dependentes
      if (data.dependents && data.dependents.length > 0) {
        data.dependents.forEach(dep => {
          if (dep.birthDate && dep.sexo && dep.parentesco && dep.estadoCivil) {
            proponentes.push({
              uuid: uuidv4(),
              parentesco: dep.parentesco,
              dataNascimento: dep.birthDate.getTime(),
              sexo: dep.sexo,
              estadoCivil: dep.estadoCivil,
            });
          }
        });
      }
      
      const filters: any = {
        profissoes: professionDesc.toUpperCase(),
        tipoProduto: "COLETIVO",
        tipoContratacaoProduto: "Adesão",
        ...(data.state && data.city && { localidade: { uf: data.state, municipio: data.city } }),
        ...(proponentes.length > 0 && { proponentes }),
      };


      console.log(
        "2. [FRONTEND] - Buscando entidades com filtros:",
        JSON.stringify(filters, null, 2)
      );

      const apiEntities = await getVexurEntities(filters);

      console.log("3. [FRONTEND] - Entidades recebidas:", apiEntities);
      setFilteredEntities(apiEntities);

    } catch (error) {
      console.error("Erro ao buscar entidades:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar entidades",
        description: "Não foi possível carregar as entidades para esta profissão.",
      });
      setFilteredEntities([]);
    } finally {
      setLoadingEntities(false);
      console.log("4. [FRONTEND] - Finalizada a busca por entidades.");
    }
  };

  const handleProfessionChange = async (professionDesc: string) => {
    console.log("1. [FRONTEND] - Profissão selecionada:", professionDesc);

    form.setValue("profession", professionDesc);
    form.resetField("entity");
    setFilteredEntities([]);

    if (!professionDesc) {
      return;
    }

    await fetchEntities(professionDesc, form.getValues());
  };

  React.useEffect(() => {
    if (initialData) {
      // Restore state selection
      if (initialData.state) {
        const state = states.find((s) => s.uf === initialData.state);
        setSelectedState(state || null);
      }
      // Restore entities based on profession
      if (initialData.profession) {
        fetchEntities(initialData.profession, initialData);
      }
    }
  }, []); // Run on mount


  React.useEffect(() => {
    if (hasDependentsValue === "nao") {
      form.setValue("dependents", []);
    } else if (hasDependentsValue === "sim" && fields.length === 0) {
      append({ 
        birthDate: new Date(), 
        sexo: 'FEMININO', 
        parentesco: 'CONJUGE', 
        estadoCivil: 'CASADO(A)' 
      });
    }
  }, [hasDependentsValue, fields.length, append, form]);


  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl rounded-2xl">
      <CardHeader className="bg-accent text-accent-foreground p-6 rounded-t-2xl">
        <CardTitle className="text-xl text-center font-bold">Peça sua Cotação</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <h3 className="text-sm font-semibold text-accent border-b-2 border-accent/30 pb-2">INFORME SEUS DADOS</h3>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (WhatsApp)</FormLabel>
                    <FormControl>
                      <Input placeholder="(XX) XXXXX-XXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sexo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="MASCULINO">Masculino</SelectItem>
                            <SelectItem value="FEMININO">Feminino</SelectItem>
                            <SelectItem value="NAO_INFORMADO">Não Informar</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="estadoCivil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado Civil</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="SOLTEIRO(A)">Solteiro(a)</SelectItem>
                            <SelectItem value="CASADO(A)">Casado(a)</SelectItem>
                            <SelectItem value="DIVORCIADO(A)">Divorciado(a)</SelectItem>
                            <SelectItem value="VIUVO(A)">Viúvo(a)</SelectItem>
                            <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <h3 className="text-sm font-semibold text-accent border-b-2 border-accent/30 pb-2 pt-2">ONDE VOCÊ MORA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={handleStateChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.uf} value={state.uf}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Município</FormLabel>
                    <Select onValueChange={handleCityChange} value={field.value || ""} disabled={!selectedState}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedState ? "Selecione" : "Escolha um estado"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedState?.cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <h3 className="text-sm font-semibold text-accent border-b-2 border-accent/30 pb-2 pt-2">DADOS DO PLANO</h3>

            <FormField
              control={form.control}
              name="profession"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissão</FormLabel>
                  <Select onValueChange={handleProfessionChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={"Selecione a profissão"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {professions.map((profession) => (
                        <SelectItem key={profession.id} value={profession.descricao}>
                          {profession.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entidade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={!form.watch("profession") || loadingEntities}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingEntities ? "Carregando entidades..." : "Selecione a entidade"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredEntities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id.toString()}>
                          {entity?.nomeFantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <DateInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Vigência</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>DD/MM/AAAA</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          variant="vigencia"
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />


            <FormField
              control={form.control}
              name="hasDependents"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Deseja adicionar dependentes?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="sim" />
                        </FormControl>
                        <FormLabel className="font-normal">Sim</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="nao" />
                        </FormControl>
                        <FormLabel className="font-normal">Não</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hasDependentsValue === 'sim' && (
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-accent border-b-2 border-accent/30 pb-2">DADOS DOS DEPENDENTES</h3>
                {fields.map((item, index) => (
                   <div key={item.id} className="space-y-4 rounded-lg border p-4">
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Dependente #{index + 1}</h4>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                      <div className="grid grid-cols-2 grid-rows-2 gap-4 items-end">
                        <FormField
                            control={form.control}
                            name={`dependents.${index}.birthDate`}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Data de Nascimento</FormLabel>
                                    <FormControl>
                                      <DateInput value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`dependents.${index}.sexo`}
                            render={({ field }) => (
                                <FormItem className="w-full">
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
                            control={form.control}
                            name={`dependents.${index}.parentesco`}
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Parentesco</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {parentescos.map((p) => (
                                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`dependents.${index}.estadoCivil`}
                            render={({ field }) => (
                                <FormItem className="w-full">
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
                    </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ 
                      birthDate: new Date(), 
                      sexo: 'FEMININO', 
                      parentesco: 'CONJUGE', 
                      estadoCivil: 'CASADO(A)' 
                    })}
                >
                  Adicionar mais dependentes
                </Button>
              </div>
            )}


            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full" disabled={loading || isUserLoading}>
                {loading ? 'Buscando...' : 'Simular'}
              </Button>
              <FormDescription className="text-center mt-2 text-xs">
                Ao clicar, você fará uma busca de planos em tempo real.
              </FormDescription>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}