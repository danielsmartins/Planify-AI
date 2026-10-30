import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
import fitz  # PyMuPDF

# Paleta exigida:
# Crítica #B91C1C, Alta #EA580C, Média #D97706, Baixa #2563EB, Ponto Forte #059669
COLOR_CRITICAL = colors.HexColor('#B91C1C')
COLOR_HIGH = colors.HexColor('#EA580C')
COLOR_MEDIUM = colors.HexColor('#D97706')
COLOR_LOW = colors.HexColor('#2563EB')
COLOR_STRONG = colors.HexColor('#059669')

COLOR_BG_DARK = colors.HexColor('#0F172A')
COLOR_TEXT_MAIN = colors.HexColor('#1E293B')
COLOR_TEXT_MUTED = colors.HexColor('#64748B')
COLOR_BORDER = colors.HexColor('#E2E8F0')
COLOR_CARD_BG = colors.HexColor('#F8FAFC')
COLOR_CODE_BG = colors.HexColor('#F1F5F9')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(SCRIPT_DIR, 'relatorio-auditoria-seguranca.pdf')
CHARTS_DIR = os.path.join(SCRIPT_DIR, 'charts')
os.makedirs(CHARTS_DIR, exist_ok=True)


class NumberedCanvas(canvas.Canvas):
    """Canvas com duas passagens para calcular e exibir 'Página X de Y' e cabeçalho."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_header_footer(self, page_count):
        if self._pageNumber == 1:
            return  # Não desenha na capa

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor('#64748B'))

        # Cabeçalho
        self.drawString(20 * mm, 287 * mm, "Relatório de Auditoria de Segurança — Planify AI")
        self.drawRightString(190 * mm, 287 * mm, "CONFIDENCIAL")
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.5)
        self.line(20 * mm, 284 * mm, 190 * mm, 284 * mm)

        # Rodapé
        self.line(20 * mm, 15 * mm, 190 * mm, 15 * mm)
        self.drawString(20 * mm, 11 * mm, "Planify AI • Auditoria de Código-Fonte e Arquitetura")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(190 * mm, 11 * mm, page_str)
        self.restoreState()


def generate_charts():
    donut_path = os.path.join(CHARTS_DIR, 'donut_severity.png')
    bar_path = os.path.join(CHARTS_DIR, 'bar_categories.png')

    # 1. Gráfico de Rosca (Severidade)
    labels = ['Crítica', 'Alta', 'Média', 'Baixa']
    counts = [3, 5, 2, 1]
    chart_colors = ['#B91C1C', '#EA580C', '#D97706', '#2563EB']

    fig, ax = plt.subplots(figsize=(4.2, 3.2), dpi=200)
    wedges, texts, autotexts = ax.pie(
        counts,
        labels=labels,
        colors=chart_colors,
        autopct='%1.0f%%',
        startangle=140,
        pctdistance=0.75,
        wedgeprops=dict(width=0.42, edgecolor='white', linewidth=2),
        textprops=dict(fontsize=8, color='#1E293B')
    )
    for at in autotexts:
        at.set_fontsize(8)
        at.set_weight('bold')
        at.set_color('white')

    ax.set_title("Achados por Severidade", fontsize=10, weight='bold', pad=10, color='#0F172A')
    plt.tight_layout()
    plt.savefig(donut_path, dpi=200, transparent=True)
    plt.close()

    # 2. Gráfico de Barras (Categorias)
    categories = [
        '1. Banco sem Tranca',
        '2. Permissão Backend',
        '3. IDOR / Posse',
        '4. Chaves Expostas',
        '5. Inputs / XSS / LLM'
    ]
    cat_counts = [2, 1, 3, 2, 3]  # totalizando os 11 achados mapeados
    bar_colors = ['#B91C1C', '#EA580C', '#B91C1C', '#EA580C', '#D97706']

    fig, ax = plt.subplots(figsize=(4.8, 3.2), dpi=200)
    bars = ax.barh(categories, cat_counts, color=bar_colors, height=0.55, edgecolor='none')
    ax.invert_yaxis()  # Ordem top-down
    ax.set_xlim(0, 4.5)
    ax.set_xlabel('Quantidade de Achados', fontsize=8, color='#64748B')
    ax.set_title("Achados por Categoria", fontsize=10, weight='bold', pad=10, color='#0F172A')
    ax.tick_params(axis='both', which='both', labelsize=7.5, colors='#1E293B')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#CBD5E1')
    ax.spines['bottom'].set_color('#CBD5E1')
    ax.xaxis.grid(True, linestyle='--', alpha=0.5, color='#E2E8F0')

    for bar in bars:
        w = bar.get_width()
        ax.annotate(f"{int(w)}",
                    xy=(w, bar.get_y() + bar.get_height() / 2),
                    xytext=(4, 0),
                    textcoords="offset points",
                    ha='left', va='center',
                    fontsize=8, weight='bold', color='#1E293B')

    plt.tight_layout()
    plt.savefig(bar_path, dpi=200, transparent=True)
    plt.close()

    return donut_path, bar_path


def build_pdf():
    donut_path, bar_path = generate_charts()

    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor('#0F172A'),
        alignment=0,
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#475569'),
        alignment=0,
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.2,
        leading=9.5,
        textColor=colors.HexColor('#0F172A'),
        backColor=COLOR_CODE_BG,
        borderColor=COLOR_BORDER,
        borderWidth=0.5,
        borderPadding=5,
        spaceAfter=6
    )

    issue_block_style = ParagraphStyle(
        'IssueBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.0,
        leading=9.0,
        textColor=colors.HexColor('#0F172A'),
        backColor=colors.HexColor('#F8FAFC'),
        borderColor=colors.HexColor('#CBD5E1'),
        borderWidth=0.8,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=10
    )

    chip_critical = ParagraphStyle(
        'ChipCrit',
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=8,
        textColor=colors.white,
        alignment=1
    )
    chip_high = ParagraphStyle(
        'ChipHigh',
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=8,
        textColor=colors.white,
        alignment=1
    )
    chip_med = ParagraphStyle(
        'ChipMed',
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=8,
        textColor=colors.white,
        alignment=1
    )
    chip_low = ParagraphStyle(
        'ChipLow',
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=8,
        textColor=colors.white,
        alignment=1
    )

    story = []

    # ==================== CAPA ====================
    story.append(Spacer(1, 20 * mm))
    story.append(Paragraph("RELATÓRIO TÉCNICO DE AUDITORIA DE SEGURANÇA", ParagraphStyle('PreTitle', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=COLOR_HIGH, spaceAfter=8)))
    story.append(Paragraph("Auditoria de Código-Fonte e Arquitetura — Planify AI", title_style))
    story.append(Paragraph("Avaliação sistemática de vulnerabilidades e vetores de risco nas 5 categorias críticas de aplicação web e APIs.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_HIGH, spaceBefore=5, spaceAfter=18))

    meta_data = [
        [Paragraph("<b>Projeto:</b> Planify AI (SaaS Controle Financeiro)", body_style),
         Paragraph("<b>Data da Auditoria:</b> 30 de Outubro de 2026", body_style)],
        [Paragraph("<b>Branch Auditada:</b> develop (commit HEAD: 4c41fcf)", body_style),
         Paragraph("<b>Status Geral:</b> Ação Requerida (3 Críticas, 5 Altas)", body_style)],
        [Paragraph("<b>Escopo:</b> 100% dos Handlers de Rota, Server Actions e Componentes", body_style),
         Paragraph("<b>Metodologia:</b> White-Box Source Code Review", body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[85 * mm, 85 * mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("Nota Metodológica & Detecção de Stack", h2_style))
    nota_texto = (
        "Antes do início dos testes, a stack do projeto foi catalogada e cada uma das cinco categorias de "
        "segurança foi mapeada para as características reais do código:<br/>"
        "• <b>Linguagem & Framework:</b> TypeScript 5 sobre Next.js 16.2.9 (App Router) e React 19.<br/>"
        "• <b>ORM & Banco de Dados:</b> Drizzle ORM sobre Neon Serverless PostgreSQL. Como não há RLS ativo "
        "no Postgres, o isolamento depende 100% da cláusula manual <code>userId</code> em cada query Drizzle.<br/>"
        "• <b>Autenticação:</b> JWT customizado assinado via <code>jose</code> (HS256) em cookie HTTP-Only. Não há "
        "middleware global ativo (o arquivo <code>middleware.ts</code> foi deletado no histórico).<br/>"
        "• <b>Modelo de Permissões:</b> Aplicação B2C monousuário; a tabela <code>users</code> não possui campos "
        "de papel (<code>role</code> ou <code>isAdmin</code>). O teste de controle de privilégio concentrou-se "
        "na autorização de rotas privilegiadas de sistema (cron jobs e webhooks).<br/>"
        "• <b>Integrações Críticas:</b> Webhook do Telegram (mensagens/voz/faturas em PDF) e APIs do Google Gemini."
    )
    story.append(Paragraph(nota_texto, body_style))

    story.append(PageBreak())

    # ==================== RESUMO EXECUTIVO ====================
    story.append(Paragraph("1. Resumo Executivo", h1_style))
    story.append(Paragraph(
        "A auditoria de código-fonte cobriu a totalidade dos endpoints de API (<code>src/app/api/...</code>), "
        "Server Actions (<code>src/app/**/actions.ts</code>), páginas protegidas e rotinas utilitárias. "
        "Foram identificados <b>11 achados de segurança verificados no código real</b>, sem falsos positivos ou "
        "especulações. Destacam-se <b>3 vulnerabilidades críticas</b> que permitem personificação de usuários, "
        "manipulação de saldo e sequestro da integração do Telegram.",
        body_style
    ))

    # Tabela com métricas rápidas
    metric_cards = [
        [
            Paragraph("<font color='#B91C1C'><b>3 CRÍTICAS</b></font><br/><font size=6.5 color='#64748B'>Acesso/mutação imediata</font>", chip_critical),
            Paragraph("<font color='#EA580C'><b>5 ALTAS</b></font><br/><font size=6.5 color='#64748B'>Falhas de autorização e injeção</font>", chip_high),
            Paragraph("<font color='#D97706'><b>2 MÉDIAS</b></font><br/><font size=6.5 color='#64748B'>Configuração e resiliência</font>", chip_med),
            Paragraph("<font color='#2563EB'><b>1 BAIXA</b></font><br/><font size=6.5 color='#64748B'>Higiene de repositório</font>", chip_low),
            Paragraph("<font color='#059669'><b>6 CONTROLES</b></font><br/><font size=6.5 color='#64748B'>Módulos auditados íntegros</font>", chip_critical),
        ]
    ]
    metric_table = Table(metric_cards, colWidths=[34 * mm, 34 * mm, 34 * mm, 34 * mm, 34 * mm])
    metric_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#FEE2E2')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#FFEDD5')),
        ('BACKGROUND', (2, 0), (2, 0), colors.HexColor('#FEF3C7')),
        ('BACKGROUND', (3, 0), (3, 0), colors.HexColor('#DBEAFE')),
        ('BACKGROUND', (4, 0), (4, 0), colors.HexColor('#D1FAE5')),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(metric_table)
    story.append(Spacer(1, 4 * mm))

    # Gráficos lado a lado
    chart_table = Table([
        [Image(donut_path, width=78 * mm, height=58 * mm),
         Image(bar_path, width=88 * mm, height=58 * mm)]
    ], colWidths=[82 * mm, 92 * mm])
    chart_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(chart_table)
    story.append(Spacer(1, 4 * mm))

    # ==================== PONTOS FORTES E FRACOS ====================
    story.append(Paragraph("2. Pontos Fortes e Pontos Fracos Centrais", h1_style))

    sw_data = [
        [
            Paragraph("<b>PONTOS FORTES (CONTROLES ROBUSTOS)</b>", ParagraphStyle('PFHead', fontName='Helvetica-Bold', fontSize=9, textColor=COLOR_STRONG)),
            Paragraph("<b>PONTOS FRACOS (RISCOS CENTRAIS)</b>", ParagraphStyle('PTHead', fontName='Helvetica-Bold', fontSize=9, textColor=COLOR_CRITICAL))
        ],
        [
            Paragraph(
                "• <b>Validação de Posse no Core de Ações:</b> Os módulos <code>accounts</code>, "
                "<code>categories</code> e <code>subscriptions</code> aplicam rigorosamente "
                "<code>and(eq(table.id, id), eq(table.userId, session.user.id))</code> em updates e deletes.<br/>"
                "• <b>Proteção Server-Side em Todas as Páginas:</b> Todas as páginas privadas "
                "(Dashboard, Contas, Cartões, Transações, etc.) checam <code>getSession()</code> no servidor antes de renderizar.<br/>"
                "• <b>Validação Estrita com Zod:</b> Todas as Server Actions validam inputs com schemas Zod tipados.<br/>"
                "• <b>Segredos de Terceiros Protegidos:</b> O arquivo <code>.env.local</code> está no <code>.gitignore</code> "
                "e nenhuma chave de API foi commitada no histórico git.<br/>"
                "• <b>Prevenção de XSS Tradicional:</b> Não há <code>dangerouslySetInnerHTML</code> nem <code>eval</code> no front.",
                body_style
            ),
            Paragraph(
                "• <b>Fallback Hardcoded de Segredo JWT:</b> A aplicação adota chave fixa se a variável não estiver setada, "
                "permitindo forjar sessões de qualquer usuário.<br/>"
                "• <b>Ausência de Autenticação no Webhook do Telegram:</b> Não há conferência do secret token, permitindo "
                "chamadas externas maliciosas.<br/>"
                "• <b>IDOR e Manipulação de Saldo via Bot:</b> Callbacks de confirmação e cancelamento alteram registros "
                "e saldos bancários sem checar titularidade.<br/>"
                "• <b>Vinculação de Conta por ID Estático:</b> O comando <code>/start &lt;userId&gt;</code> vincula a conta "
                "sem comprovação de posse ou senha.<br/>"
                "• <b>Bypass em Rotas de Cron:</b> Se <code>CRON_SECRET</code> estiver ausente, a checagem é pulada.",
                body_style
            )
        ]
    ]
    sw_table = Table(sw_data, colWidths=[85 * mm, 85 * mm])
    sw_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#ECFDF5')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#FEF2F2')),
        ('BACKGROUND', (0, 1), (0, 1), COLOR_CARD_BG),
        ('BACKGROUND', (1, 1), (1, 1), COLOR_CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(sw_table)

    story.append(PageBreak())

    # ==================== TABELA DETALHADA DE ACHADOS ====================
    story.append(Paragraph("3. Tabela de Achados Detalhados por Categoria", h1_style))
    story.append(Paragraph(
        "A tabela a seguir consolida todos os 11 achados de segurança identificados, indicando a severidade, "
        "a localização exata no código-fonte e o resumo do risco operacional associado.",
        body_style
    ))

    def make_chip(sev_text, sev_color):
        t = Table([[Paragraph(sev_text, ParagraphStyle('C', fontName='Helvetica-Bold', fontSize=6.5, textColor=colors.white, alignment=1))]], colWidths=[20 * mm], rowHeights=[5.5 * mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), sev_color),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        return t

    findings_rows = [
        [Paragraph("<b>Severidade</b>", body_bold), Paragraph("<b>Arquivo e Linha</b>", body_bold), Paragraph("<b>Categoria e Resumo do Achado</b>", body_bold)],
        # 1
        [make_chip("CRÍTICA", COLOR_CRITICAL),
         Paragraph("<code>src/lib/auth.ts:19</code>", body_style),
         Paragraph("<b>Chaves Expostas:</b> Fallback estático hardcoded <code>'super_secret_key_planify'</code> permite forjar JWTs e obter login total sem senha.", body_style)],
        # 2
        [make_chip("CRÍTICA", COLOR_CRITICAL),
         Paragraph("<code>src/app/api/telegram/route.ts:106, 167, 191, 245, 317</code>", body_style),
         Paragraph("<b>IDOR / Autenticação:</b> Webhook do Telegram sem verificação de segredo e callbacks que deletam, confirmam e alteram saldo de outros usuários.", body_style)],
        # 3
        [make_chip("CRÍTICA", COLOR_CRITICAL),
         Paragraph("<code>src/app/api/telegram/route.ts:624-635</code>", body_style),
         Paragraph("<b>IDOR / Posse:</b> Vinculação de conta via <code>/start &lt;userId&gt;</code> aceita UUID estático sem OTP, permitindo Account Takeover no Telegram.", body_style)],
        # 4
        [make_chip("ALTA", COLOR_HIGH),
         Paragraph("<code>src/app/api/cron/subscriptions/route.ts:21-27</code><br/><code>src/app/api/cron/daily-report/route.ts:11-17</code>", body_style),
         Paragraph("<b>Permissão Backend:</b> Lógica de checagem condicional (<code>&&</code>) pula autenticação se <code>CRON_SECRET</code> não for configurado.", body_style)],
        # 5
        [make_chip("ALTA", COLOR_HIGH),
         Paragraph("<code>src/app/api/import-invoice/route.ts:90-101, 127</code>", body_style),
         Paragraph("<b>IDOR / Banco sem Tranca:</b> Importação de fatura PDF aceita <code>creditCardId</code> de terceiro sem validar posse do usuário da sessão.", body_style)],
        # 6
        [make_chip("ALTA", COLOR_HIGH),
         Paragraph("<code>src/app/cards/actions.ts:20-32, 78-89</code>", body_style),
         Paragraph("<b>IDOR / Banco sem Tranca:</b> Cadastro e atualização de cartão aceita <code>autoPayAccountId</code> de outro usuário sem validação de posse.", body_style)],
        # 7
        [make_chip("ALTA", COLOR_HIGH),
         Paragraph("<code>src/lib/telegram.ts:19, 52</code><br/><code>src/lib/telegram-utils.ts:130, 165</code>", body_style),
         Paragraph("<b>Inputs / XSS:</b> Injeção de Markdown em mensagens enviadas ao Telegram causa falha de envio (HTTP 400) e permite inserção de links forjados.", body_style)],
        # 8
        [make_chip("ALTA", COLOR_HIGH),
         Paragraph("<code>src/app/api/ai-report/route.ts:40-54</code><br/><code>src/app/api/ai-insights/route.ts:63-73</code>", body_style),
         Paragraph("<b>Inputs / LLM:</b> Prompt Injection em relatórios de IA devido à interpolação direta de descrições e categorias sem delimitação contextual.", body_style)],
        # 9
        [make_chip("MÉDIA", COLOR_MEDIUM),
         Paragraph("<code>next.config.ts:28</code>", body_style),
         Paragraph("<b>Inputs / CSP:</b> Política de Content-Security-Policy permissiva com <code>'unsafe-inline'</code> e <code>'unsafe-eval'</code> anula defesa em profundidade.", body_style)],
        # 10
        [make_chip("MÉDIA", COLOR_MEDIUM),
         Paragraph("<code>src/db/index.ts:5</code>", body_style),
         Paragraph("<b>Chaves / Config:</b> Fallback silencioso de conexão do banco para URL fictícia mascara falhas de ambiente em vez de falhar no startup.", body_style)],
        # 11
        [make_chip("BAIXA", COLOR_LOW),
         Paragraph("<code>src/lib/test-local.ts:29, 51, 57</code>", body_style),
         Paragraph("<b>Chaves / Repositório:</b> Arquivo rastreado no Git expõe caminhos locais do sistema operacional e ID real de usuário do Telegram.", body_style)],
    ]

    findings_table = Table(findings_rows, colWidths=[24 * mm, 50 * mm, 96 * mm])
    findings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_BG_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_CARD_BG]),
    ]))
    story.append(findings_table)

    story.append(Spacer(1, 8 * mm))

    # ==================== RECOMENDAÇÕES PRIORIZADAS ====================
    story.append(Paragraph("4. Recomendações Priorizadas (Plano de Remediação)", h1_style))

    recs_data = [
        [
            Paragraph("<b>PRIORIDADE 1 (P1) — CRÍTICA / IMEDIATA (24-48 horas)</b>", ParagraphStyle('R1', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_CRITICAL)),
        ],
        [
            Paragraph(
                "1. <b>Eliminar Fallback de JWT_SECRET:</b> Forçar erro de inicialização imediato (<code>throw new Error(...)</code>) caso <code>JWT_SECRET</code> não esteja presente no ambiente. Rotacionar a chave em produção imediatamente.<br/>"
                "2. <b>Blindar Webhook do Telegram:</b> Configurar e exigir o cabeçalho <code>X-Telegram-Bot-Api-Secret-Token</code> em todas as requisições para <code>/api/telegram</code>.<br/>"
                "3. <b>Eliminar IDOR nos Callbacks do Telegram:</b> Associar cada transação/parcelamento buscado em callbacks ao usuário cadastrado com o <code>chatId</code> do remetente.<br/>"
                "4. <b>Vincular Telegram com Código Seguro:</b> Substituir <code>/start &lt;userId&gt;</code> por um token temporário de 6 dígitos gerado na sessão do dashboard web com validade de 10 minutos.",
                body_style
            )
        ],
        [
            Paragraph("<b>PRIORIDADE 2 (P2) — ALTA (Próxima Sprint / 1 semana)</b>", ParagraphStyle('R2', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_HIGH)),
        ],
        [
            Paragraph(
                "5. <b>Corrigir Guardas de Cron:</b> Rejeitar a execução se <code>authHeader !== `Bearer ${process.env.CRON_SECRET}`</code> ou se <code>CRON_SECRET</code> for vazio, independentemente do ambiente.<br/>"
                "6. <b>Validar Posse de Cartões e Contas:</b> Nas rotas de importação de fatura e Server Actions de cartões, validar que <code>creditCardId</code> e <code>autoPayAccountId</code> pertencem ao <code>session.user.id</code>.<br/>"
                "7. <b>Higienizar Markdown do Telegram:</b> Aplicar função de escape para caracteres reservados do Telegram antes de interpolar textos em mensagens.<br/>"
                "8. <b>Delimitar Contexto de IA:</b> Utilizar blocos JSON e delimitadores estruturados ao enviar entradas de usuários para a API Gemini.",
                body_style
            )
        ],
        [
            Paragraph("<b>PRIORIDADE 3 (P3) — MÉDIA E BAIXA (Ciclo Contínuo)</b>", ParagraphStyle('R3', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_MEDIUM)),
        ],
        [
            Paragraph(
                "9. <b>Endurecer CSP:</b> Remover <code>'unsafe-eval'</code> e avaliar uso de nonces para scripts inline.<br/>"
                "10. <b>Excluir <code>src/lib/test-local.ts</code>:</b> Remover arquivo com dados pessoais e caminhos locais do histórico git.",
                body_style
            )
        ]
    ]
    recs_table = Table(recs_data, colWidths=[170 * mm])
    recs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#FEE2E2')),
        ('BACKGROUND', (0, 1), (0, 1), colors.white),
        ('BACKGROUND', (0, 2), (0, 2), colors.HexColor('#FFEDD5')),
        ('BACKGROUND', (0, 3), (0, 3), colors.white),
        ('BACKGROUND', (0, 4), (0, 4), colors.HexColor('#FEF3C7')),
        ('BACKGROUND', (0, 5), (0, 5), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(recs_table)

    story.append(PageBreak())

    # ==================== ISSUES PARA O GITHUB ====================
    story.append(Paragraph("5. Issues Prontas para o GitHub", h1_style))
    story.append(Paragraph(
        "Abaixo estão os textos completos em Markdown de cada issue acionável, prontos para copiar e colar no GitHub Issues. "
        "Os achados menores de mesma natureza foram agrupados em issues coesas para evitar ruído.",
        body_style
    ))

    issues_list = [
        # Issue 1
        """--- ISSUE 1 ---
Título: [Segurança] Tornar JWT_SECRET obrigatório e eliminar fallback estático inseguro

Labels sugeridas: security, critical, backend, auth

### Descrição do Problema
O arquivo `src/lib/auth.ts` define a chave secreta de assinatura JWT com um fallback estático `process.env.JWT_SECRET || 'super_secret_key_planify'`. Da mesma forma, `src/db/index.ts` utiliza fallback de string fictícia.

### Por que é explorável
Se `JWT_SECRET` não estiver presente ou falhar ao carregar no container ou Vercel, o backend inicializa normalmente usando o segredo público `'super_secret_key_planify'`. Qualquer invasor pode assinar tokens JWT forjados contendo o ID de qualquer usuário e autenticar-se como administrador/vítima sem fornecer credenciais.

### Evidência de Código
`src/lib/auth.ts:19`:
```ts
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_key_planify');
```

### Impacto
Comprometimento total da autenticação e quebra do isolamento de todos os inquilinos (Account Takeover generalizado).

### Sugestão de Correção
1. Lançar exceção imediata no startup se `JWT_SECRET` não estiver presente:
```ts
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET must be configured with at least 32 characters.');
}
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
```
2. Rotacionar imediatamente o segredo de produção.

### Critérios de Aceite
- [ ] O backend rejeita a inicialização com erro explícito caso `JWT_SECRET` esteja ausente ou vazio.
- [ ] O fallback hardcoded foi completamente removido do código.
- [ ] Teste unitário valida a rejeição de inicialização sem a variável configurada.
--- FIM ISSUE 1 ---""",

        # Issue 2
        """--- ISSUE 2 ---
Título: [Segurança] Validar Secret Token no Webhook do Telegram e corrigir IDOR em callbacks

Labels sugeridas: security, critical, api, telegram, idor

### Descrição do Problema
O endpoint `POST /api/telegram` não valida o cabeçalho `X-Telegram-Bot-Api-Secret-Token`. Além disso, os manipuladores de `callback_query` (`confirm_inst_`, `cancel_inst_`, `toggle_type_`, `confirm_`, `cancel_`) consultam objetos no banco puramente pelo ID, sem checar se pertencem ao remetente da mensagem.

### Por que é explorável
Um atacante pode forjar requisições HTTP para `/api/telegram` enviando payloads de botões com IDs de outros usuários. Isso permite cancelar transações alheias, alterar tipos de lançamentos e até debitar/estornar saldos de contas bancárias de terceiros (`accounts.balance`).

### Evidência de Código
`src/app/api/telegram/route.ts:106, 191, 245, 317`:
```ts
const txRes = await db.select().from(transactions).where(eq(transactions.id, txId));
```

### Impacto
Destruição e adulteração de dados financeiros de outros usuários e fraude em saldos bancários.

### Sugestão de Correção
1. Validar no topo da rota:
```ts
const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
2. Nos callbacks, obter o usuário vinculado ao `chatId` e filtrar:
```ts
const txRes = await db.select().from(transactions)
  .where(and(eq(transactions.id, txId), eq(transactions.userId, user.id)));
```

### Critérios de Aceite
- [ ] Requisições sem o header secreto correto recebem 401 Unauthorized.
- [ ] Callbacks com IDs de transações pertencentes a outro usuário são rejeitados com erro e não alteram o banco.
- [ ] Testes automatizados cobrem a verificação de posse em todas as ações de callback.
--- FIM ISSUE 2 ---""",

        # Issue 3
        """--- ISSUE 3 ---
Título: [Segurança] Corrigir vinculação insegura de contas Telegram via /start <userId>

Labels sugeridas: security, critical, auth, telegram

### Descrição do Problema
O comando `/start <userId>` aceita o UUID do usuário em texto claro para associar a conta do Planify AI ao `telegramChatId` do remetente sem exigir código temporário, confirmação de sessão ou senha.

### Por que é explorável
O link exibido na tela web (`src/app/page.tsx:324`) expõe o UUID. Qualquer usuário malicioso que conheça ou descubra esse UUID pode enviar `/start <userId>` ao bot a partir de seu próprio Telegram e assumir a conta, recebendo relatórios com o saldo financeiro diário e operando transações em nome da vítima.

### Evidência de Código
`src/app/api/telegram/route.ts:629`:
```ts
await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, userId));
```

### Impacto
Sequestro do canal de comunicação Telegram, vazamento de saldos e transações financeiras.

### Sugestão de Correção
1. Implementar um fluxo de OTP (One-Time Password) ou token assinado com validade curta (ex: 10 minutos):
   - O usuário clica em "Conectar Telegram" no dashboard;
   - O backend gera um token assinado (HMAC) ou código de 6 dígitos temporário salvo no banco/Redis: `/start link_ABC123`;
   - O bot valida o código único e expira o token imediatamente após o uso.

### Critérios de Aceite
- [ ] O comando `/start` não aceita mais UUIDs brutos de usuários.
- [ ] A vinculação só ocorre mediante token assinado/OTP temporário com tempo de expiração curto (<= 15 min).
- [ ] Tentativas de reutilizar o token geram erro.
--- FIM ISSUE 3 ---""",

        # Issue 4
        """--- ISSUE 4 ---
Título: [Segurança] Corrigir guarda lógica de autorização em rotas de Cron Jobs

Labels sugeridas: security, high, backend, api

### Descrição do Problema
As rotas `GET /api/cron/subscriptions` e `GET /api/cron/daily-report` utilizam uma condicional que só rejeita a chamada caso `process.env.CRON_SECRET` exista. Se a variável não estiver definida ou se `NODE_ENV` não for `'production'`, a rota roda sem exigir credenciais.

### Por que é explorável
Se um operador esquecer de configurar `CRON_SECRET` na Vercel ou se a rota for chamada em ambiente de staging/preview, qualquer pessoa pode chamar `GET /api/cron/subscriptions` e acionar débitos em massa e avanço de cobranças em todas as assinaturas do banco.

### Evidência de Código
`src/app/api/cron/subscriptions/route.ts:21-27`:
```ts
if (
  process.env.NODE_ENV === 'production' && 
  process.env.CRON_SECRET && 
  authHeader !== `Bearer ${process.env.CRON_SECRET}`
) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Impacto
Execução não autorizada de débitos em massa e envio descontrolado de mensagens via Telegram.

### Sugestão de Correção
Exigir sempre a presença do segredo (fail-closed):
```ts
const expectedSecret = process.env.CRON_SECRET;
if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Critérios de Aceite
- [ ] Se `CRON_SECRET` não estiver setado, a rota retorna 401 Unauthorized.
- [ ] Requisições sem o header `Bearer <CRON_SECRET>` recebem 401 Unauthorized em todos os ambientes.
--- FIM ISSUE 4 ---""",

        # Issue 5
        """--- ISSUE 5 ---
Título: [Segurança] Validar titularidade de creditCardId e autoPayAccountId

Labels sugeridas: security, high, idor, backend

### Descrição do Problema
Na rota `POST /api/import-invoice` e nas Server Actions de cartões (`addCreditCard`, `updateCreditCard`), os parâmetros `creditCardId` e `autoPayAccountId` são aceitos sem validação de que pertencem ao usuário autenticado (`session.user.id`).

### Por que é explorável
Um usuário pode importar despesas vinculando-as a cartões de crédito de outros usuários, corrompendo relatórios e faturas alheias. Também pode definir uma conta de débito automático pertencente a terceiro.

### Evidência de Código
`src/app/api/import-invoice/route.ts:90`:
```ts
const cardRes = await db.select().from(creditCards).where(eq(creditCards.id, creditCardId));
```

### Impacto
Injeção de transações no contexto de terceiros e violação de isolamento entre usuários.

### Sugestão de Correção
Adicionar a checagem explícita de `userId`:
```ts
const cardRes = await db.select().from(creditCards)
  .where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, session.user.id)));
if (cardRes.length === 0) {
  return NextResponse.json({ error: 'Cartão de crédito não encontrado ou não autorizado' }, { status: 403 });
}
```

### Critérios de Aceite
- [ ] A importação de faturas falha com 403 caso o `creditCardId` pertença a outro usuário.
- [ ] `autoPayAccountId` só pode ser associado se a conta pertencer ao usuário autenticado.
--- FIM ISSUE 5 ---""",

        # Issue 6
        """--- ISSUE 6 ---
Título: [Segurança] Sanitizar caracteres especiais em mensagens com parse_mode Markdown no Telegram

Labels sugeridas: security, high, telegram, xss

### Descrição do Problema
O módulo de envio para o Telegram (`src/lib/telegram.ts`) utiliza `parse_mode: "Markdown"` sem escapar caracteres especiais (`*`, `_`, `[`, `]`, `\``, `(`) contidos nos dados fornecidos pelo usuário (`description`, `category`).

### Por que é explorável
Descrições com caracteres Markdown não balanceados provocam erro HTTP 400 da API do Telegram (`can't parse entities`), quebrando o fluxo da transação. Além disso, permite injeção de links forjados em mensagens enviadas pelo bot.

### Evidência de Código
`src/lib/telegram-utils.ts:165`:
```ts
return `${icone} *Revisão de Transação*\\n\\nTipo: *${tipo}*\\nDescrição: *${data.description}*...`;
```

### Impacto
Negação de serviço funcional no registro de transações via Telegram e risco de phishing por injeção de links.

### Sugestão de Correção
Criar função de escape para o modo Markdown ou migrar para `parse_mode: "HTML"` utilizando entidades seguras (`&amp;`, `&lt;`, `&gt;`):
```ts
function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\\]()~`>#+\\-=|{}.!])/g, '\\\\$1');
}
```

### Critérios de Aceite
- [ ] Transações com nomes contendo `_`, `*`, `[` ou `]` são enviadas sem erro pela API do Telegram.
- [ ] Links Markdown maliciosos inseridos em descrições não são renderizados como hiperlinks clicáveis.
--- FIM ISSUE 6 ---""",

        # Issue 7
        """--- ISSUE 7 ---
Título: [Segurança] Endurecer defesas contra Prompt Injection e reforçar Content Security Policy

Labels sugeridas: security, high, ai, csp, frontend

### Descrição do Problema
1. O texto das transações e faturas é concatenado diretamente nas mensagens de prompt do Google Gemini em `src/app/api/ai-report/route.ts` e `src/lib/gemini.ts`.
2. A política de CSP em `next.config.ts:28` permite `'unsafe-inline'` e `'unsafe-eval'`.
3. O arquivo `src/lib/test-local.ts` rastreado no git expõe caminhos absolutos locais do desenvolvedor e o ID real de chat do Telegram.

### Impacto
Manipulação de saídas da IA via dados controlados pelo usuário e redução das defesas do navegador contra XSS.

### Sugestão de Correção
1. Utilizar delimitadores XML/JSON claros no prompt do Gemini com instruções explícitas de que os dados não contêm comandos do sistema.
2. Remover `'unsafe-eval'` do CSP em `next.config.ts`.
3. Remover `src/lib/test-local.ts` do repositório ou adicioná-lo ao `.gitignore`.

### Critérios de Aceite
- [ ] Prompts do Gemini utilizam tags delimitadoras de contexto estruturado.
- [ ] A diretiva `'unsafe-eval'` é removida da configuração do CSP.
- [ ] O arquivo `src/lib/test-local.ts` é expurgado do versionamento git.
--- FIM ISSUE 7 ---"""
    ]

    for issue_text in issues_list:
        story.append(Paragraph(issue_text.replace('\n', '<br/>'), issue_block_style))

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Relatório gerado com sucesso em: {PDF_PATH}")


if __name__ == '__main__':
    build_pdf()
