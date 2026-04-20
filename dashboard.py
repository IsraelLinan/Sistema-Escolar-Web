import streamlit as st
import pandas as pd
from colegio_lib import db_pool
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go

# ── Configuración de página ──────────────────────────────────────────────────
st.set_page_config(
    page_title="Dashboard — Sistema Escolar",
    page_icon="🏫",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ── CSS personalizado (tema oscuro coherente con la app desktop) ─────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    .stApp {
        background-color: #0f1117;
    }
    /* Ocultar elementos de Streamlit por defecto */
    #MainMenu, footer, header { visibility: hidden; }

    /* Tarjetas de métricas */
    [data-testid="metric-container"] {
        background: #1a1d27;
        border: 1px solid #2e3350;
        border-radius: 14px;
        padding: 20px 24px;
    }
    [data-testid="metric-container"] label {
        color: #94a3b8 !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    [data-testid="metric-container"] [data-testid="stMetricValue"] {
        color: #e2e8f0 !important;
        font-size: 36px !important;
        font-weight: 700 !important;
    }
    [data-testid="metric-container"] [data-testid="stMetricDelta"] {
        font-size: 13px !important;
    }

    /* Título principal */
    .main-title {
        font-size: 28px;
        font-weight: 700;
        color: #e2e8f0;
        margin-bottom: 2px;
    }
    .main-subtitle {
        font-size: 14px;
        color: #94a3b8;
        margin-bottom: 0;
    }
    .header-bar {
        background: #1a1d27;
        border: 1px solid #2e3350;
        border-radius: 14px;
        padding: 18px 24px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
    }

    /* Input de fecha */
    [data-testid="stDateInput"] {
        background: #1a1d27;
    }
    input[type="date"] {
        background-color: #22263a !important;
        color: #e2e8f0 !important;
        border: 1px solid #2e3350 !important;
        border-radius: 8px !important;
        padding: 8px 12px !important;
    }

    /* Mensaje de info */
    .stAlert {
        background: #1a1d27!important;
        border: 1px solid #2e3350 !important;
        border-radius: 12px !important;
        color: #94a3b8 !important;
    }

    /* Separador */
    hr { border-color: #2e3350; }
</style>
""", unsafe_allow_html=True)


# ── Colores para gráficos ────────────────────────────────────────────────────
CHART_COLORS = {
    "Estudiantes": "#4f8ef7",
    "Docentes":    "#22c55e",
}
PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font_color="#94a3b8",
    font_family="Inter",
    margin=dict(l=20, r=20, t=40, b=20),
    legend=dict(
        bgcolor="rgba(26,29,39,0.8)",
        bordercolor="#2e3350",
        borderwidth=1,
        font_color="#e2e8f0"
    )
)


@st.cache_data(ttl=60)
def get_data_for_dashboard(selected_date):
    conn = None
    try:
        conn = db_pool.get_conn()
        cur = conn.cursor()
        start = datetime.combine(selected_date, datetime.min.time())
        end   = datetime.combine(selected_date, datetime.max.time())
        cur.execute(
            """
            SELECT 'Estudiantes' AS tipo, COUNT(*) AS cantidad FROM ingresos_estudiantes
            WHERE hora_ingreso BETWEEN %s AND %s
            UNION ALL
            SELECT 'Docentes' AS tipo, COUNT(*) AS cantidad FROM ingresos_docentes
            WHERE hora_ingreso BETWEEN %s AND %s
            """,
            (start, end, start, end)
        )
        data = cur.fetchall()
        cur.close()
        return pd.DataFrame(data, columns=['tipo', 'cantidad'])
    except Exception as e:
        st.error(f"Error al conectar con la base de datos: {e}")
        return pd.DataFrame()
    finally:
        if conn:
            db_pool.put_conn(conn)


@st.cache_data(ttl=60)
def get_weekly_trend(selected_date):
    """Obtiene los últimos 7 días de ingresos para mostrar tendencia."""
    conn = None
    try:
        conn = db_pool.get_conn()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT DATE(hora_ingreso) as fecha, COUNT(*) as cantidad, 'Estudiantes' as tipo
            FROM ingresos_estudiantes
            WHERE hora_ingreso >= %s::date - INTERVAL '6 days'
            GROUP BY DATE(hora_ingreso)
            UNION ALL
            SELECT DATE(hora_ingreso) as fecha, COUNT(*) as cantidad, 'Docentes' as tipo
            FROM ingresos_docentes
            WHERE hora_ingreso >= %s::date - INTERVAL '6 days'
            GROUP BY DATE(hora_ingreso)
            ORDER BY fecha
            """,
            (selected_date, selected_date)
        )
        data = cur.fetchall()
        cur.close()
        return pd.DataFrame(data, columns=['fecha', 'cantidad', 'tipo'])
    except Exception:
        return pd.DataFrame()
    finally:
        if conn:
            db_pool.put_conn(conn)


def create_dashboard():
    # ── Encabezado ────────────────────────────────────────────────────────────
    col_title, col_date = st.columns([3, 1])
    with col_title:
        st.markdown("""
        <div style='margin-bottom:8px'>
            <p class='main-title'>🏫 Dashboard de Asistencia</p>
            <p class='main-subtitle'>Monitoreo en tiempo real de ingresos del personal escolar</p>
        </div>
        """, unsafe_allow_html=True)
    with col_date:
        today = datetime.now().date()
        selected_date = st.date_input("📅 Fecha", today, label_visibility="collapsed")

    st.markdown("---")

    # ── Datos ─────────────────────────────────────────────────────────────────
    df = get_data_for_dashboard(selected_date)
    df_trend = get_weekly_trend(selected_date)

    if df.empty or df['cantidad'].sum() == 0:
        st.info(f"📭  No hay registros de ingresos para el **{selected_date.strftime('%d de %B de %Y')}**.")
        return

    total = int(df['cantidad'].sum())
    est   = int(df[df['tipo'] == 'Estudiantes']['cantidad'].values[0]) if 'Estudiantes' in df['tipo'].values else 0
    doc   = int(df[df['tipo'] == 'Docentes']['cantidad'].values[0])    if 'Docentes'    in df['tipo'].values else 0

    # ── Métricas superiores ───────────────────────────────────────────────────
    m1, m2, m3 = st.columns(3)
    with m1:
        st.metric("Total de Ingresos", total)
    with m2:
        st.metric("Estudiantes", est, delta=f"{round(est/total*100)}% del total" if total else None)
    with m3:
        st.metric("Docentes", doc, delta=f"{round(doc/total*100)}% del total" if total else None)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Gráficos principales ──────────────────────────────────────────────────
    g1, g2 = st.columns(2)

    with g1:
        fig_bar = px.bar(
            df, x='tipo', y='cantidad',
            title=f'Ingresos del {selected_date.strftime("%d/%m/%Y")}',
            labels={'tipo': '', 'cantidad': 'Ingresos'},
            color='tipo',
            color_discrete_map=CHART_COLORS,
            text='cantidad'
        )
        fig_bar.update_traces(textposition="outside", textfont_size=14,
                              marker_line_width=0, width=0.45)
        fig_bar.update_xaxes(showgrid=False, tickfont_color="#94a3b8")
        fig_bar.update_yaxes(showgrid=True, gridcolor="#2e3350",
                             tickfont_color="#94a3b8")
        fig_bar.update_layout(**PLOTLY_LAYOUT, showlegend=False,
                              title_font_color="#e2e8f0", title_font_size=14)
        st.plotly_chart(fig_bar, use_container_width=True)

    with g2:
        fig_pie = px.pie(
            df, values='cantidad', names='tipo',
            title='Distribución Estudiantes / Docentes',
            color='tipo', color_discrete_map=CHART_COLORS,
            hole=0.55
        )
        fig_pie.update_traces(textfont_color="#e2e8f0", textfont_size=13,
                              marker_line_color="#0f1117", marker_line_width=2)
        fig_pie.update_layout(**PLOTLY_LAYOUT,
                              title_font_color="#e2e8f0", title_font_size=14)
        st.plotly_chart(fig_pie, use_container_width=True)

    # ── Gráfico de tendencia semanal ──────────────────────────────────────────
    if not df_trend.empty:
        st.markdown("### 📈 Tendencia — últimos 7 días")
        fig_line = px.line(
            df_trend, x='fecha', y='cantidad', color='tipo',
            color_discrete_map=CHART_COLORS,
            markers=True,
            labels={'fecha': 'Fecha', 'cantidad': 'Ingresos', 'tipo': ''}
        )
        fig_line.update_traces(line_width=2.5, marker_size=7)
        fig_line.update_xaxes(showgrid=False, tickfont_color="#94a3b8")
        fig_line.update_yaxes(showgrid=True, gridcolor="#2e3350", tickfont_color="#94a3b8")
        fig_line.update_layout(**PLOTLY_LAYOUT, title_font_color="#e2e8f0")
        st.plotly_chart(fig_line, use_container_width=True)

    # ── Pie de página ──────────────────────────────────────────────────────────
    st.markdown("---")
    st.markdown(
        f"<p style='color:#94a3b8; font-size:11px; text-align:center;'>"
        f"Última actualización: {datetime.now().strftime('%H:%M:%S')} &nbsp;•&nbsp; "
        f"Sistema de Gestión Escolar</p>",
        unsafe_allow_html=True
    )


if __name__ == '__main__':
    create_dashboard()