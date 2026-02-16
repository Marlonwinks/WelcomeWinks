import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface ResponseBreakdownChartProps {
  responses: Array<{
    question: string;
    answer: string;
    score: number;
    isReverse: boolean;
    responseValue: number;
  }>;
  totalScore: number;
  maxPossibleScore: number;
  className?: string;
}

const COLORS = {
  yes: '#22c55e',      // green-500
  probably: '#84cc16', // lime-500
  probablyNot: '#f59e0b', // amber-500
  no: '#ef4444',       // red-500
  neutral: '#6b7280'   // gray-500
};

const getResponseColor = (responseValue: number) => {
  if (responseValue >= 0.8) return COLORS.yes;
  if (responseValue >= 0.5) return COLORS.probably;
  if (responseValue >= 0.2) return COLORS.probablyNot;
  return COLORS.no;
};

export const ResponseBreakdownChart: React.FC<ResponseBreakdownChartProps> = ({
  responses,
  totalScore,
  maxPossibleScore,
  className
}) => {
  // Normalize total score to handle legacy 5.1 scores
  const normalizedTotalScore = Math.min(totalScore, 5.0);
  const normalizedMaxScore = Math.min(maxPossibleScore, 5.0);
  // Prepare data for bar chart
  const barChartData = responses.map((response, index) => ({
    question: `Q${index + 1}`,
    fullQuestion: response.question,
    score: response.score,
    responseValue: response.responseValue,
    answer: response.answer,
    isReverse: response.isReverse,
    color: getResponseColor(response.responseValue)
  }));

  // Prepare data for pie chart (response distribution)
  const responseCounts = responses.reduce((acc, response) => {
    const key = response.answer.toLowerCase().replace(' ', '');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(responseCounts).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    color: COLORS[key as keyof typeof COLORS] || COLORS.neutral
  }));

  // Calculate score percentage using normalized values
  const scorePercentage = (normalizedTotalScore / normalizedMaxScore) * 100;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Response Breakdown Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Distribution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">{normalizedTotalScore.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Total Score</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-primary">{scorePercentage.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">of Maximum</div>
              </div>
            </div>

            {/* Score Interpretation */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="font-medium">Score Interpretation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {scorePercentage >= 70 
                  ? "This business is rated as very welcoming by the community"
                  : scorePercentage >= 30
                  ? "This business has mixed community feedback about inclusiveness"
                  : "This business has concerning feedback about inclusiveness"
                }
              </p>
            </div>

            {/* Response Summary */}
            <div className="space-y-2">
              <h4 className="font-medium">Response Summary</h4>
              <div className="grid grid-cols-2 gap-2">
                {pieChartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="question" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis 
                    domain={[0, normalizedMaxScore]}
                    tickFormatter={(value) => value.toFixed(1)}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.fullQuestion}</p>
                            <p className="text-sm text-muted-foreground">
                              Answer: <Badge variant="outline">{data.answer}</Badge>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Score: {data.score.toFixed(2)}
                            </p>
                            {data.isReverse && (
                              <p className="text-xs text-muted-foreground">
                                (Reverse Scored)
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="score" 
                    fill="#8884d8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Question Details */}
            <div className="space-y-3">
              <h4 className="font-medium">Question Details</h4>
              {responses.map((response, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">{response.question}</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline"
                        style={{ 
                          backgroundColor: getResponseColor(response.responseValue) + '20',
                          borderColor: getResponseColor(response.responseValue),
                          color: getResponseColor(response.responseValue)
                        }}
                      >
                        {response.answer}
                      </Badge>
                      {response.isReverse && (
                        <Badge variant="secondary" className="text-xs">
                          Reverse Scored
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {response.score.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Distribution Details */}
            <div className="space-y-2">
              <h4 className="font-medium">Response Distribution</h4>
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.value}</span>
                    <span className="text-xs text-muted-foreground">
                      ({((item.value / responses.length) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
