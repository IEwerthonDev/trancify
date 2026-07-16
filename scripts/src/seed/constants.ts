/** Valores fixos do ambiente demo — mantenha em sync com SEED_CREDENTIALS.md */
export const SEED = {
  admin: {
    email: "admin@trancify.com",
    password: "admin123",
  },
  tenants: {
    naira: {
      email: "demo@salaodanaira.com.br",
      password: "tenant123",
      slug: "naira",
      name: "Salão da Naíra",
      ownerName: "Naíra Silva",
      whatsapp: "5511999887766",
      primaryColor: "#6D1F3A",
      secondaryColor: "#FAF7F5",
      cpf: "11144477735",
      address: "Rua das Tranças",
      addressNumber: "120",
      neighborhood: "Vila Madalena",
      city: "São Paulo",
      state: "SP",
      cep: "05435000",
    },
    bela: {
      email: "demo@belatransa.com.br",
      password: "tenant123",
      slug: "bela",
      name: "Studio Bela Trança",
      ownerName: "Bela Costa",
      whatsapp: "5511988776655",
      primaryColor: "#2D1B4E",
      secondaryColor: "#F5F0FF",
    },
  },
  clients: {
    ana: {
      cpf: "12345678909",
      name: "Ana Souza",
      phone: "5511987654321",
      age: 28,
      hairDescription: "Cabelo cacheado, médio, com volume.",
    },
    maria: {
      cpf: "98765432100",
      name: "Maria Lima",
      phone: "5511976543210",
      age: 32,
      hairDescription: "Cabelo crespo, longo, com química recente.",
    },
  },
  tokens: {
    pendingRegistration: "demo-pending-registration-token",
    reviewOpen: "00000000-0000-4000-8000-000000000001",
    reviewSubmitted: "00000000-0000-4000-8000-000000000002",
  },
  pendingRegistration: {
    email: "pendente@exemplo.com",
    password: "pendente123",
    salonName: "Studio Pendente",
    slug: "studio-pendente",
    plan: "monthly",
  },
} as const;
