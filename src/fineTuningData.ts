import duckdb from "duckdb";

type Sentiment = "positivo" | "negativo" | "neutro";

const reviews: { review: string; sentiment: Sentiment }[] = [
    {
        review: "A FlowDesk facilitou muito a organização dos meus leads. Agora consigo acompanhar as oportunidades sem perder informações.",
        sentiment: "positivo"
    },
    {
        review: "A integração com outros canais de atendimento é excelente e economiza bastante tempo da equipe.",
        sentiment: "positivo"
    },
    {
        review: "A plataforma é intuitiva e consegui aprender a usar as principais funcionalidades rapidamente.",
        sentiment: "positivo"
    },
    {
        review: "Gosto de como a FlowDesk centraliza as informações dos clientes em um único lugar.",
        sentiment: "positivo"
    },
    {
        review: "Os relatórios ajudam bastante a entender o desempenho comercial e identificar oportunidades de melhoria.",
        sentiment: "positivo"
    },
    {
        review: "A distribuição automática de leads tornou o trabalho da equipe muito mais organizado.",
        sentiment: "positivo"
    },
    {
        review: "O sistema funciona bem e melhorou a comunicação entre os vendedores e os clientes.",
        sentiment: "positivo"
    },
    {
        review: "Consigo acompanhar o histórico de interações com cada cliente sem precisar procurar em várias ferramentas.",
        sentiment: "positivo"
    },
    {
        review: "O suporte foi rápido e resolveu minha dúvida de maneira clara.",
        sentiment: "positivo"
    },
    {
        review: "Depois que começamos a usar a FlowDesk, ficou muito mais fácil acompanhar as tarefas comerciais.",
        sentiment: "positivo"
    },
    {
        review: "A plataforma apresenta lentidão em alguns momentos, principalmente quando acessamos muitos registros.",
        sentiment: "negativo"
    },
    {
        review: "Tive dificuldades para configurar as integrações e a documentação não explicou tudo o que precisava.",
        sentiment: "negativo"
    },
    {
        review: "O sistema apresentou erros durante o cadastro de novos contatos e precisei repetir o processo.",
        sentiment: "negativo"
    },
    {
        review: "Algumas funcionalidades são difíceis de encontrar, e a navegação poderia ser mais simples.",
        sentiment: "negativo"
    },
    {
        review: "A sincronização das mensagens falha ocasionalmente e isso atrapalha o atendimento aos clientes.",
        sentiment: "negativo"
    },
    {
        review: "Os relatórios demoram para carregar e dificultam a análise dos resultados no dia a dia.",
        sentiment: "negativo"
    },
    {
        review: "Não recebi uma resposta satisfatória do suporte quando relatei um problema na plataforma.",
        sentiment: "negativo"
    },
    {
        review: "A distribuição de leads nem sempre respeita a ordem esperada, causando confusão entre os vendedores.",
        sentiment: "negativo"
    },
    {
        review: "Senti falta de opções de personalização para adaptar o sistema ao processo comercial da empresa.",
        sentiment: "negativo"
    },
    {
        review: "Após uma atualização, algumas funcionalidades deixaram de funcionar como antes.",
        sentiment: "negativo"
    },
    {
        review: "Estou usando a FlowDesk há duas semanas e ainda estou avaliando se ela atende às nossas necessidades.",
        sentiment: "neutro"
    },
    {
        review: "A plataforma oferece funcionalidades de gestão de leads, relatórios e integração com canais de atendimento.",
        sentiment: "neutro"
    },
    {
        review: "A empresa começou a utilizar a FlowDesk neste mês e ainda estamos configurando o ambiente.",
        sentiment: "neutro"
    },
    {
        review: "O sistema permite visualizar o histórico de interações e consultar os dados dos clientes.",
        sentiment: "neutro"
    },
    {
        review: "Utilizo a FlowDesk principalmente para registrar contatos e acompanhar o andamento das negociações.",
        sentiment: "neutro"
    },
    {
        review: "A versão atual possui recursos de automação e permite acompanhar as atividades da equipe comercial.",
        sentiment: "neutro"
    },
    {
        review: "Ainda não utilizei todas as funcionalidades disponíveis na plataforma.",
        sentiment: "neutro"
    },
    {
        review: "O acesso é feito pelo navegador e os usuários podem consultar as informações conforme suas permissões.",
        sentiment: "neutro"
    },
    {
        review: "Estamos comparando a FlowDesk com outras ferramentas antes de decidir qual solução manter.",
        sentiment: "neutro"
    },
    {
        review: "Minha equipe utiliza a plataforma para registrar atividades, mas ainda não temos dados suficientes para avaliar os resultados.",
        sentiment: "neutro"
    }
];

const db = new duckdb.Database(':memory:');
const con = db.connect();

const values = reviews.map(
    ({ review, sentiment }) => `('${review.replace(/'/g, "''")}', '${sentiment}')`
);

console.log("Values:", values);

con.run(`
    COPY (SELECT * FROM (VALUES ${values}) AS t(review, sentiment)) TO 'reviews.parquet' (FORMAT PARQUET)
    `)