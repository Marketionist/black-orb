export interface ChartDataPoint {
  close: number
  date: string
}

export interface StockQuote {
  symbol: string
  shortName?: string
  longName?: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  chart?: ChartDataPoint[]
}

export interface HistoricalCharts {
  chart30d: ChartDataPoint[]
  chart1y: ChartDataPoint[]
}

export interface ChartOptions {
  period1: Date
  interval: '15m' | '1d' | '1wk' | '1mo'
}
