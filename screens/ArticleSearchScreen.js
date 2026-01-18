import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
  Dimensions,
  Keyboard,
  ActivityIndicator as RNActivityIndicator,
} from 'react-native';
import {
  Text,
  Searchbar,
  Card,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import ArticleSearchService from '../services/ArticleSearchService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const ArticleSearchScreen = ({ route, navigation }) => {
  const { presetQuery } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState(presetQuery || '');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [apiStatus, setApiStatus] = useState('Проверка...');

  // Популярные запросы на русском
  const popularQueries = [
    'лучевая терапия',
    'α/β значения',
    'рак простаты',
    'BED расчет',
    'радиохирургия',
    'осложнения облучения',
    'гипофракционирование',
    'IMRT планирование',
  ];

  useEffect(() => {
    loadHistory();
    checkApiStatus();
    
    if (presetQuery) {
      handleSearch(presetQuery);
    }
  }, []);

  const loadHistory = async () => {
    try {
      const stats = await ArticleSearchService.getCacheStats();
      setSearchHistory(stats.keys || []);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const checkApiStatus = async () => {
    setShowApiStatus(true);
    setApiStatus('Проверка соединения...');
    
    try {
      // Простая проверка доступности интернета
      const response = await fetch('https://api.openalex.org/', { 
        method: 'HEAD',
        timeout: 3000 
      });
      setApiStatus(response.ok ? '✅ API доступен' : '❌ API недоступен');
    } catch (error) {
      setApiStatus('❌ Нет подключения к интернету');
    }
    
    setTimeout(() => setShowApiStatus(false), 3000);
  };

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) {
      Alert.alert('Введите запрос', 'Пожалуйста, введите поисковый запрос');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setArticles([]);
    
    try {
      console.log('🔍 Выполняем поиск:', query);
      const result = await ArticleSearchService.searchArticles(query);
      
      if (result.success) {
        setArticles(result.data || []);
        
        // Обновляем историю
        if (!searchHistory.includes(query)) {
          const newHistory = [query, ...searchHistory.slice(0, 9)];
          setSearchHistory(newHistory);
        }
        
        // Показываем информацию о режиме
        if (result.isDemo) {
          Alert.alert(
            'Демо-режим',
            'Показаны демонстрационные статьи. Для реального поиска проверьте подключение к интернету.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Ошибка', result.error || 'Не удалось выполнить поиск');
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при поиске');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenArticle = (url) => {
    if (!url) {
      Alert.alert('Ошибка', 'Ссылка на статью недоступна');
      return;
    }

    Alert.alert(
      'Открыть статью',
      'Статья будет открыта в браузере',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Открыть', 
          onPress: () => {
            Linking.openURL(url).catch(() => {
              Alert.alert('Ошибка', 'Не удалось открыть статью');
            });
          }
        }
      ]
    );
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Очистка истории',
      'Удалить всю историю поиска?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            await ArticleSearchService.clearCache();
            setSearchHistory([]);
            setArticles([]);
            Alert.alert('Успешно', 'История очищена');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Статус соединения */}
      {showApiStatus && (
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <RNActivityIndicator size="small" color="#1976d2" />
            <Text style={styles.statusText}>{apiStatus}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Поисковая строка */}
      <Card style={styles.searchCard}>
        <Card.Content>
          <Searchbar
            placeholder="Поиск статей на русском..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch()}
            style={styles.searchBar}
            loading={loading}
          />
          
          <Button
            mode="contained"
            onPress={() => handleSearch()}
            loading={loading}
            icon="magnify"
            style={styles.searchButton}
            contentStyle={styles.buttonContent}
          >
            Найти
          </Button>
        </Card.Content>
      </Card>

      <ScrollView style={styles.scrollView}>
        {/* Популярные запросы */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🔥 Популярные запросы</Text>
            <View style={styles.chipsContainer}>
              {popularQueries.map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.chipButton}
                  onPress={() => {
                    setSearchQuery(query);
                    handleSearch(query);
                  }}
                >
                  <Text style={styles.chipText}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* История поиска */}
        {searchHistory.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📝 История поиска</Text>
                <Button
                  mode="text"
                  onPress={handleClearHistory}
                  compact
                  textColor="#F44336"
                  icon="delete"
                >
                  Очистить
                </Button>
              </View>
              <View style={styles.chipsContainer}>
                {searchHistory.map((query, index) => (
                  <Chip
                    key={index}
                    mode="outlined"
                    onPress={() => {
                      setSearchQuery(query);
                      handleSearch(query);
                    }}
                    style={styles.historyChip}
                    textStyle={styles.chipText}
                  >
                    {query}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Результаты поиска */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976d2" />
            <Text style={styles.loadingText}>Поиск статей...</Text>
          </View>
        ) : articles.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              📚 Найдено статей: {articles.length}
              {articles[0]?.isDemo && ' (демо-режим)'}
            </Text>
            
            {articles.map((article, index) => (
              <Card key={article.id || index} style={styles.articleCard}>
                <Card.Content>
                  <Text style={styles.articleTitle} numberOfLines={2}>
                    {article.title}
                  </Text>
                  
                  <View style={styles.articleMeta}>
                    <Text style={styles.articleAuthors}>{article.authors}</Text>
                    <Text style={styles.articleYear}>{article.year}</Text>
                  </View>
                  
                  <Text style={styles.articleJournal}>{article.journal}</Text>
                  
                  <Text style={styles.articleAbstract} numberOfLines={3}>
                    {article.abstract}
                  </Text>
                  
                  <View style={styles.articleFooter}>
                    <View style={styles.articleStats}>
                      {article.citations > 0 && (
                        <Text style={styles.citationText}>
                          📊 {article.citations} цитирований
                        </Text>
                      )}
                      {article.doi && (
                        <Text style={styles.doiText}>
                          DOI: {article.doi}
                        </Text>
                      )}
                    </View>
                    
                    <Button
                      mode="contained"
                      icon="open-in-new"
                      onPress={() => handleOpenArticle(article.url)}
                      style={styles.openButton}
                      compact
                    >
                      Открыть
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        ) : searchQuery ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="text-search" size={64} color="#BDBDBD" />
              <Text style={styles.emptyTitle}>Ничего не найдено</Text>
              <Text style={styles.emptyText}>
                Попробуйте другой запрос или проверьте подключение к интернету
              </Text>
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusCard: {
    margin: 10,
    backgroundColor: '#e3f2fd',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1976d2',
  },
  searchCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  searchBar: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#1976d2',
  },
  buttonContent: {
    height: 46,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  chipText: {
    fontSize: 14,
    color: '#1976d2',
  },
  historyChip: {
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  articleCard: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
    lineHeight: 22,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  articleAuthors: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  articleYear: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  articleJournal: {
    fontSize: 13,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  articleAbstract: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleStats: {
    flex: 1,
  },
  citationText: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 2,
  },
  doiText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  openButton: {
    backgroundColor: '#1976d2',
  },
  emptyCard: {
    marginTop: 40,
    backgroundColor: 'white',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ArticleSearchScreen;