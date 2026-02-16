import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Plus, 
  Edit, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Calculator,
  Users
} from 'lucide-react';
import { scoringConfigService, ScoringConfiguration, SurveyQuestionConfig } from '@/services/scoringConfig.service';
import { toast } from '@/hooks/use-toast';

interface ScoringConfigManagerProps {
  className?: string;
}

export const ScoringConfigManager: React.FC<ScoringConfigManagerProps> = ({ className }) => {
  const [scoringConfigs, setScoringConfigs] = useState<ScoringConfiguration[]>([]);
  const [activeConfig, setActiveConfig] = useState<ScoringConfiguration | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isEditingQuestions, setIsEditingQuestions] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<ScoringConfiguration>>({});
  const [editingQuestion, setEditingQuestion] = useState<Partial<SurveyQuestionConfig>>({});
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [configs, questions, active] = await Promise.all([
        scoringConfigService.getAllScoringConfigs(),
        scoringConfigService.getSurveyQuestionConfigs(),
        scoringConfigService.getActiveScoringConfig()
      ]);
      
      setScoringConfigs(configs);
      setSurveyQuestions(questions);
      setActiveConfig(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast({
        title: "Error",
        description: "Failed to load scoring configurations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async () => {
    try {
      const newConfig = await scoringConfigService.createScoringConfig(
        {
          responseValues: {
            yes: 0.833,
            probably: 0.56,
            probablyNot: 0.28,
            no: 0
          },
          questionCount: surveyQuestions.length,
          description: 'New scoring configuration'
        },
        'admin'
      );
      
      await loadData();
      toast({
        title: "Success",
        description: "New scoring configuration created"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create scoring configuration",
        variant: "destructive"
      });
    }
  };

  const handleActivateConfig = async (configId: string) => {
    try {
      await scoringConfigService.activateScoringConfig(configId);
      await loadData();
      toast({
        title: "Success",
        description: "Scoring configuration activated"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to activate configuration",
        variant: "destructive"
      });
    }
  };

  const handleUpdateConfig = async () => {
    if (!activeConfig) return;
    
    try {
      await scoringConfigService.updateScoringConfig(activeConfig.id, editingConfig);
      setIsEditingConfig(false);
      await loadData();
      toast({
        title: "Success",
        description: "Scoring configuration updated"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive"
      });
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion.questionId) return;
    
    try {
      await scoringConfigService.upsertSurveyQuestion(editingQuestion as SurveyQuestionConfig);
      setIsEditingQuestions(false);
      setShowQuestionDialog(false);
      await loadData();
      toast({
        title: "Success",
        description: "Survey question updated"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive"
      });
    }
  };

  const startEditingConfig = () => {
    setEditingConfig(activeConfig ? { ...activeConfig } : {});
    setIsEditingConfig(true);
  };

  const startEditingQuestion = (question?: SurveyQuestionConfig) => {
    setEditingQuestion(question ? { ...question } : {
      id: '',
      questionId: '',
      text: '',
      reverseScored: false,
      firebaseKey: '',
      isActive: true,
      order: surveyQuestions.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    setShowQuestionDialog(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Scoring Configuration
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Survey Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          {/* Active Configuration */}
          {activeConfig && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Active Scoring Configuration
                    </CardTitle>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditingConfig}
                    disabled={isEditingConfig}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isEditingConfig ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Yes Response Value</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={editingConfig.responseValues?.yes || 0.833}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            responseValues: {
                              ...editingConfig.responseValues,
                              yes: parseFloat(e.target.value) || 0.833
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Probably Response Value</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={editingConfig.responseValues?.probably || 0.56}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            responseValues: {
                              ...editingConfig.responseValues,
                              probably: parseFloat(e.target.value) || 0.56
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Probably Not Response Value</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={editingConfig.responseValues?.probablyNot || 0.28}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            responseValues: {
                              ...editingConfig.responseValues,
                              probablyNot: parseFloat(e.target.value) || 0.28
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>No Response Value</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={editingConfig.responseValues?.no || 0}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            responseValues: {
                              ...editingConfig.responseValues,
                              no: parseFloat(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Question Count</Label>
                      <Input
                        type="number"
                        min="1"
                        value={editingConfig.questionCount || 6}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          questionCount: parseInt(e.target.value) || 6
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={editingConfig.description || ''}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          description: e.target.value
                        })}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateConfig}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingConfig(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted/30 rounded">
                        <div className="text-2xl font-bold text-primary">{activeConfig.responseValues.yes}</div>
                        <div className="text-sm text-muted-foreground">Yes</div>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded">
                        <div className="text-2xl font-bold text-primary">{activeConfig.responseValues.probably}</div>
                        <div className="text-sm text-muted-foreground">Probably</div>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded">
                        <div className="text-2xl font-bold text-primary">{activeConfig.responseValues.probablyNot}</div>
                        <div className="text-sm text-muted-foreground">Probably Not</div>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded">
                        <div className="text-2xl font-bold text-primary">{activeConfig.responseValues.no}</div>
                        <div className="text-sm text-muted-foreground">No</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-primary/10 rounded">
                        <div className="text-xl font-bold text-primary">{activeConfig.maxPossibleScore.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">Max Possible Score</div>
                      </div>
                      <div className="text-center p-3 bg-primary/10 rounded">
                        <div className="text-xl font-bold text-primary">{activeConfig.questionCount}</div>
                        <div className="text-sm text-muted-foreground">Questions</div>
                      </div>
                      <div className="text-center p-3 bg-primary/10 rounded">
                        <div className="text-xl font-bold text-primary">
                          {(activeConfig.welcomingLevelThresholds.veryWelcoming / activeConfig.maxPossibleScore * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Very Welcoming Threshold</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>Description:</strong> {activeConfig.description}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Configuration History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Configuration History</CardTitle>
                <Button onClick={handleCreateConfig}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Configuration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Max Score</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoringConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.version}</TableCell>
                      <TableCell>
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{config.maxPossibleScore.toFixed(1)}</TableCell>
                      <TableCell>{config.questionCount}</TableCell>
                      <TableCell>{config.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                        {!config.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateConfig(config.id)}
                          >
                            Activate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Survey Questions</CardTitle>
                <Button onClick={() => startEditingQuestion()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Reverse Scored</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveyQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">{question.order}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">{question.text}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={question.reverseScored ? "destructive" : "default"}>
                          {question.reverseScored ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={question.isActive ? "default" : "secondary"}>
                          {question.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingQuestion(question)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Question Edit Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion.id ? 'Edit Question' : 'Add New Question'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Input
                value={editingQuestion.text || ''}
                onChange={(e) => setEditingQuestion({
                  ...editingQuestion,
                  text: e.target.value
                })}
                placeholder="Enter the question text..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Firebase Key</Label>
              <Input
                value={editingQuestion.firebaseKey || ''}
                onChange={(e) => setEditingQuestion({
                  ...editingQuestion,
                  firebaseKey: e.target.value
                })}
                placeholder="e.g., trumpWelcome"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={editingQuestion.order || 1}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    order: parseInt(e.target.value) || 1
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Reverse Scored</Label>
                <Select
                  value={editingQuestion.reverseScored ? 'true' : 'false'}
                  onValueChange={(value) => setEditingQuestion({
                    ...editingQuestion,
                    reverseScored: value === 'true'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleUpdateQuestion}>
                <Save className="h-4 w-4 mr-2" />
                Save Question
              </Button>
              <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
