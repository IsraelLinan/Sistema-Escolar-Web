import streamlit as st
import pandas as pd
from colegio_lib import db_pool
from datetime import datetime, timedelta
import plotly.express as px
import plotly.graph_objects as go

# ── Configuración de página ──────────────────────────────────────────────────
st.set_page_config(
    page_title="Dashboard — Sistema Escolar",
    page_icon="🏫",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ── CSS personalizado (tema claro) ────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    .stApp {
        background-color: #f1f5f9;
    }
    #MainMenu, footer, header { visibility: hidden; }

    [data-testid="metric-container"] {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 20px 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    [data-testid="metric-container"] label {
        color: #64748b !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    [data-testid="metric-container"] [data-testid="stMetricValue"] {
        color: #0f172a !important;
        font-size: 36px !important;
        font-weight: 700 !important;
    }

    .main-title {
        font-size: 28px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 2px;
    }
    .main-subtitle {
        font-size: 14px;
        color: #64748b;
        margin-bottom: 0;
    }
    .section-title {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
        margin: 8px 0 12px 0;
    }

    [data-testid="stDateInput"] {
        background: #ffffff;
    }
    input[type="date"] {
        background-color: #ffffff !important;
        color: #0f172a !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        padding: 8px 12px !important;
    }

    .stAlert {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        color: #64748b !important;
    }

    hr { border-color: #e2e8f0; }
</style>
""", unsafe_allow_html=True)


# ── Colores ───────────────────────────────────────────────────────────────────
CHART_COLORS = {
    "Estudiantes": "#4f8ef7",
    "Docentes":    "#22c55e",
    "Auxiliares":  "#f59e0b",
}
PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font_color="#64748b",
    font_family="Inter",
    margin=dict(l=20, r=20, t=40, b=20),
    legend=dict(
        bgcolor="rgba(255,255,255,0.8)",
        bordercolor="#e2e8f0",
        borderwidth=1,
        font_color="#0f172a"
    )
)


# ── Consultas a la base de datos ──────────────────────────────────────────────

@st.cache_data(ttl=60)
def get_data_for_dashboard(selected_date):
    """Totales de ingresos del día seleccionado, por tipo de personal."""
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
            UNION ALL
            SELECT 'Auxiliares' AS tipo, COUNT(*) AS cantidad FROM ingresos_auxiliares
            WHERE hora_ingreso BETWEEN %s AND %s
            """,
            (start, end, start, end, start, end)
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
    """Tendencia de lunes a viernes de la semana que contiene selected_date."""
    conn = None
    try:
        # Calcular el lunes y el viernes de la semana de selected_date
        lunes = selected_date - timedelta(days=selected_date.weekday())
        viernes = lunes + timedelta(days=4)

        conn = db_pool.get_conn()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT DATE(hora_ingreso) as fecha, COUNT(*) as cantidad, 'Estudiantes' as tipo
            FROM ingresos_estudiantes
            WHERE DATE(hora_ingreso) BETWEEN %s AND %s
            GROUP BY DATE(hora_ingreso)
            UNION ALL
            SELECT DATE(hora_ingreso) as fecha, COUNT(*) as cantidad, 'Docentes' as tipo
            FROM ingresos_docentes
            WHERE DATE(hora_ingreso) BETWEEN %s AND %s
            GROUP BY DATE(hora_ingreso)
            UNION ALL
            SELECT DATE(hora_ingreso) as fecha, COUNT(*) as cantidad, 'Auxiliares' as tipo
            FROM ingresos_auxiliares
            WHERE DATE(hora_ingreso) BETWEEN %s AND %s
            GROUP BY DATE(hora_ingreso)
            ORDER BY fecha
            """,
            (lunes, viernes, lunes, viernes, lunes, viernes)
        )
        data = cur.fetchall()
        cur.close()
        df = pd.DataFrame(data, columns=['fecha', 'cantidad', 'tipo'])

        # Rellenar los 5 días (lunes a viernes) aunque no tengan registros
        dias_semana = pd.date_range(lunes, viernes, freq='D')
        base = pd.MultiIndex.from_product(
            [dias_semana.date, ['Estudiantes', 'Docentes', 'Auxiliares']],
            names=['fecha', 'tipo']
        ).to_frame(index=False)
        df = base.merge(df, on=['fecha', 'tipo'], how='left').fillna({'cantidad': 0})
        df['cantidad'] = df['cantidad'].astype(int)
        return df, lunes, viernes
    except Exception:
        return pd.DataFrame(), None, None
    finally:
        if conn:
            db_pool.put_conn(conn)


# ── Dashboard ──────────────────────────────────────────────────────────────────

def create_dashboard():
    # Encabezado
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

    # Datos
    df = get_data_for_dashboard(selected_date)
    df_trend, lunes, viernes = get_weekly_trend(selected_date)

    est = int(df[df['tipo'] == 'Estudiantes']['cantidad'].values[0]) if not df.empty and 'Estudiantes' in df['tipo'].values else 0
    doc = int(df[df['tipo'] == 'Docentes']['cantidad'].values[0])    if not df.empty and 'Docentes'    in df['tipo'].values else 0
    aux = int(df[df['tipo'] == 'Auxiliares']['cantidad'].values[0])  if not df.empty and 'Auxiliares'  in df['tipo'].values else 0

    # ── 1. Tarjetas de totales ────────────────────────────────────────────────
    m1, m2, m3 = st.columns(3)
    with m1:
        st.metric("🎓 Estudiantes", est)
    with m2:
        st.metric("👨‍🏫 Docentes", doc)
    with m3:
        st.metric("👷 Auxiliares", aux)

    st.markdown("<br>", unsafe_allow_html=True)

    if est + doc + aux == 0:
        st.info(f"📭  No hay registros de ingresos para el **{selected_date.strftime('%d de %B de %Y')}**.")
    else:
        # ── 2. Gráfico de barras + pastel ────────────────────────────────────
        st.markdown(f"<p class='section-title'>📊 Ingresos del {selected_date.strftime('%d/%m/%Y')}</p>", unsafe_allow_html=True)
        g1, g2 = st.columns(2)

        with g1:
            fig_bar = px.bar(
                df, x='tipo', y='cantidad',
                labels={'tipo': '', 'cantidad': 'Ingresos'},
                color='tipo',
                color_discrete_map=CHART_COLORS,
                text='cantidad'
            )
            fig_bar.update_traces(textposition="outside", textfont_size=14,
                                  marker_line_width=0, width=0.45)
            fig_bar.update_xaxes(showgrid=False, tickfont_color="#64748b")
            fig_bar.update_yaxes(showgrid=True, gridcolor="#e2e8f0",
                                 tickfont_color="#64748b")
            fig_bar.update_layout(**PLOTLY_LAYOUT, showlegend=False)
            st.plotly_chart(fig_bar, use_container_width=True)

        with g2:
            fig_pie = px.pie(
                df, values='cantidad', names='tipo',
                color='tipo', color_discrete_map=CHART_COLORS,
                hole=0.55
            )
            fig_pie.update_traces(textfont_color="#0f172a", textfont_size=13,
                                  marker_line_color="#f1f5f9", marker_line_width=2)
            fig_pie.update_layout(**PLOTLY_LAYOUT)
            st.plotly_chart(fig_pie, use_container_width=True)

    # ── 3. Tendencia semanal (lunes a viernes) ───────────────────────────────
    if lunes and viernes:
        st.markdown("---")
        st.markdown(
            f"<p class='section-title'>📈 Tendencia semanal — {lunes.strftime('%d/%m')} al {viernes.strftime('%d/%m/%Y')}</p>",
            unsafe_allow_html=True
        )
        if not df_trend.empty:
            fig_line = px.line(
                df_trend, x='fecha', y='cantidad', color='tipo',
                color_discrete_map=CHART_COLORS,
                markers=True,
                labels={'fecha': 'Fecha', 'cantidad': 'Ingresos', 'tipo': ''}
            )
            fig_line.update_traces(line_width=2.5, marker_size=7)
            fig_line.update_xaxes(showgrid=False, tickfont_color="#64748b")
            fig_line.update_yaxes(showgrid=True, gridcolor="#e2e8f0", tickfont_color="#64748b")
            fig_line.update_layout(**PLOTLY_LAYOUT)
            st.plotly_chart(fig_line, use_container_width=True)

    # ── Pie de página ──────────────────────────────────────────────────────────
    st.markdown("---")
    st.markdown(
        f"<p style='color:#64748b; font-size:11px; text-align:center;'>"
        f"Última actualización: {datetime.now().strftime('%H:%M:%S')} &nbsp;•&nbsp; "
        f"Sistema de Gestión Escolar</p>",
        unsafe_allow_html=True
    )


if __name__ == '__main__':
    create_dashboard()