// screens/ReferenceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
  Linking,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Divider,
  IconButton,
  FAB,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import {
  getAllReferences,
  addReference,
  updateReference,
  deleteReference,
} from '../database/referenceRepo';

const { width } = Dimensions.get('window');

// Вспомогательная функция для парсинга ссылок
const parseReferences = (text) => {
  if (!text || !text.trim()) return [];
  
  const references = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const match = line.match(/(.*?)\s*\((\d{4}|н\.д\.)\)\s*(?::\s*(https?:\/\/\S+))?/);
    if (match) {
      references.push({
        title: match[1]?.trim() || 'Исследование',
        year: match[2] || 'н.д.',
        url: match[3] || ''
      });
    } else {
      references.push({
        title: line.trim(),
        year: 'н.д.',
        url: ''
      });
    }
  });
  
  return references;
};

export default function ReferenceScreen() {
  const [references, setReferences] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingReference, setEditingReference] = useState(null);
  const [formData, setFormData] = useState({
    tissue: '',
    alphaBeta: '',
    description: '',
    referencesText: '',
  });
  const [selectedReference, setSelectedReference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Слушатель клавиатуры
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Загрузка данных
  const loadReferences = async () => {
    try {
      setLoading(true);
      const data = await getAllReferences();
      setReferences(data);
      console.log('Загружено записей справочника:', data.length);
    } catch (error) {
      console.error('Error loading references:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить справочник');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  // Очистка формы
  const clearForm = () => {
    setFormData({ 
      tissue: '', 
      alphaBeta: '', 
      description: '', 
      referencesText: '' 
    });
    setEditingReference(null);
  };

  // Открытие модалки для добавления
  const handleAddPress = () => {
    clearForm();
    setModalVisible(true);
  };

  // Открытие модалки для редактирования
  const handleEditPress = (item) => {
    let referencesText = '';
    if (item.references && Array.isArray(item.references)) {
      referencesText = item.references.map(ref => {
        if (ref.url) {
          return `${ref.title || 'Исследование'} (${ref.year || 'н.д.'}): ${ref.url}`;
        }
        return `${ref.title || 'Исследование'} (${ref.year || 'н.д.'})`;
      }).join('\n');
    }
    
    setFormData({
      tissue: item.tissue || '',
      alphaBeta: item.alphaBeta?.toString() || '',
      description: item.description || '',
      referencesText: referencesText
    });
    
    setEditingReference(item);
    setModalVisible(true);
  };

  // Открытие детальной модалки
  const handleItemPress = (item) => {
    setSelectedReference(item);
    setDetailModalVisible(true);
  };

  // Сохранение записи
  const handleSave = async () => {
    // Валидация
    if (!formData.tissue.trim()) {
      Alert.alert('Ошибка', 'Введите название ткани');
      return;
    }

    if (!formData.alphaBeta.trim()) {
      Alert.alert('Ошибка', 'Введите значение α/β');
      return;
    }

    const alphaBetaValue = parseFloat(formData.alphaBeta.replace(',', '.'));
    if (isNaN(alphaBetaValue) || alphaBetaValue <= 0) {
      Alert.alert('Ошибка', 'α/β должно быть положительным числом');
      return;
    }

    try {
      const referencesArray = parseReferences(formData.referencesText);
      
      const referenceData = {
        tissue: formData.tissue.trim(),
        alphaBeta: alphaBetaValue,
        description: formData.description.trim(),
        references: referencesArray,
      };

      if (editingReference) {
        await updateReference(editingReference.id, referenceData);
        Alert.alert('Успех', 'Запись обновлена');
      } else {
        await addReference(referenceData);
        Alert.alert('Успех', 'Запись добавлена');
      }

      setModalVisible(false);
      clearForm();
      await loadReferences();
    } catch (error) {
      console.error('Error saving reference:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить запись');
    }
  };

  // Удаление записи
  const handleDelete = async () => {
    if (!selectedReference) return;

    Alert.alert(
      'Подтверждение',
      `Удалить "${selectedReference.tissue}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReference(selectedReference.id);
              setDetailModalVisible(false);
              await loadReferences();
              Alert.alert('Успех', 'Запись удалена');
            } catch (error) {
              console.error('Error deleting reference:', error);
              Alert.alert('Ошибка', 'Не удалось удалить запись');
            }
          },
        },
      ]
    );
  };

  const renderReferenceItem = ({ item, index }) => {
    return (
      <TouchableOpacity 
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <Card style={[
          styles.card,
          index === 0 && styles.firstCard,
          index === references.length - 1 && styles.lastCard
        ]}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.itemMain}>
              <Text style={styles.tissueText} numberOfLines={1}>
                {item.tissue || 'Без названия'}
              </Text>
              <Text style={styles.alphaBetaText}>
                α/β = {item.alphaBeta || 'н/д'}
              </Text>
              {item.description ? (
                <Text style={styles.descriptionText} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => handleEditPress(item)}
              style={styles.editButton}
              mode="contained"
              containerColor="#e3f2fd"
              iconColor="#1976d2"
            />
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  // Убрали заголовок списка - заголовок уже в навигации

  // Пустой список
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyText}>Справочник пуст</Text>
      <Text style={styles.emptySubtext}>
        Нажмите "+" чтобы добавить первую запись
      </Text>
    </View>
  );

  // Экран загрузки
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Загрузка справочника...</Text>
      </View>
    );
  }

  // Компонент формы для модального окна
  const renderFormModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setModalVisible(false);
        clearForm();
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Заголовок модалки */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReference ? '✏️ Редактировать запись' : '➕ Добавить новую запись'}
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => {
                  setModalVisible(false);
                  clearForm();
                }}
              />
            </View>
            
            {/* Прокручиваемая форма */}
            <ScrollView 
              style={styles.formScrollView}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                label="Название ткани *"
                value={formData.tissue}
                onChangeText={(text) => setFormData({ ...formData, tissue: text })}
                style={styles.input}
                mode="outlined"
                autoFocus={!editingReference}
                placeholder="Например: Легкие (поздние эффекты)"
                returnKeyType="next"
              />

              <TextInput
                label="Значение α/β *"
                value={formData.alphaBeta}
                onChangeText={(text) => setFormData({ ...formData, alphaBeta: text })}
                keyboardType="decimal-pad"
                style={styles.input}
                mode="outlined"
                placeholder="Например: 3.0"
                returnKeyType="next"
              />

              <TextInput
                label="Описание"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Медицинское описание ткани"
                returnKeyType="next"
              />

              <TextInput
                label="Ссылки на исследования"
                value={formData.referencesText}
                onChangeText={(text) => setFormData({ ...formData, referencesText: text })}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={4}
                placeholder={`Формат:\nНазвание исследования (год): URL\nПример:\nSmith et al. (2020): https://example.com`}
                returnKeyType="done"
              />
              
              {/* Подсказка о формате */}
              <View style={styles.formatHint}>
                <Text style={styles.formatHintText}>
                  💡 Каждая ссылка с новой строки
                </Text>
              </View>
            </ScrollView>
            
            {/* Кнопки */}
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => {
                  setModalVisible(false);
                  clearForm();
                }}
                style={styles.modalButton}
              >
                Отмена
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={[styles.modalButton, styles.saveButton]}
              >
                {editingReference ? 'Сохранить изменения' : 'Добавить запись'}
              </Button>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={references}
        renderItem={renderReferenceItem}
        keyExtractor={(item) => `ref-${item.id}`}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Кнопка добавления */}
      <FAB
        icon="plus"
        style={[styles.fab, keyboardVisible && styles.hiddenFab]}
        onPress={handleAddPress}
        color="#fff"
      />

      {/* Исправленная модалка формы */}
      {renderFormModal()}

      {/* Модалка детального просмотра */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContainer}>
            {selectedReference && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailTitleContainer}>
                    <Text style={styles.detailTitle} numberOfLines={2}>
                      {selectedReference.tissue}
                    </Text>
                    <Chip
                      style={styles.alphaBetaChip}
                      textStyle={styles.alphaBetaChipText}
                    >
                      α/β = {selectedReference.alphaBeta}
                    </Chip>
                  </View>
                  <IconButton
                    icon="close"
                    size={24}
                    onPress={() => setDetailModalVisible(false)}
                  />
                </View>

                <Divider />

                <ScrollView 
                  style={styles.detailBody}
                  contentContainerStyle={styles.detailContent}
                  showsVerticalScrollIndicator={true}
                >
                  {selectedReference.description ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Описание:</Text>
                      <Text style={styles.detailDescription}>
                        {selectedReference.description}
                      </Text>
                    </View>
                  ) : null}

                  {selectedReference.references && selectedReference.references.length > 0 && (
                    <View style={styles.referencesSection}>
                      <Text style={styles.sectionTitle}>📚 Научные источники:</Text>
                      {selectedReference.references.map((ref, index) => (
                        <View key={index} style={styles.referenceItem}>
                          <Text style={styles.referenceTitle}>
                            {ref.title} ({ref.year})
                          </Text>
                          {ref.url ? (
                            <TouchableOpacity 
                              onPress={() => Linking.openURL(ref.url)}
                              style={styles.referenceLinkContainer}
                            >
                              <Text style={styles.referenceLink} numberOfLines={1}>
                                🔗 {ref.url}
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.infoSection}>
                    <Text style={styles.infoTitle}>ℹ️ О α/β соотношении:</Text>
                    <Text style={styles.infoText}>
                      • Низкие значения (1-3): Позднереагирующие нормальные ткани
                      {'\n'}• Средние значения (3-5): Большинство опухолей
                      {'\n'}• Высокие значения (8-10+): Раннереагирующие ткани
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.detailFooter}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleEditPress(selectedReference);
                    }}
                    style={styles.editDetailButton}
                    icon="pencil"
                  >
                    Изменить
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleDelete}
                    style={styles.deleteDetailButton}
                    icon="delete"
                    buttonColor="#f44336"
                  >
                    Удалить
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 16, // Добавили отступ сверху вместо заголовка
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 1,
    marginHorizontal: 16,
  },
  firstCard: {
    marginTop: 0, // Убрали marginTop так как нет заголовка
  },
  lastCard: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemMain: {
    flex: 1,
    marginRight: 12,
  },
  tissueText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  alphaBetaText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  editButton: {
    margin: 0,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976d2',
  },
  hiddenFab: {
    display: 'none',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  
  // Модалки
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    minHeight: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  formScrollView: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  formatHint: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
  },
  formatHintText: {
    fontSize: 12,
    color: '#1976d2',
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#1976d2',
  },
  
  // Детальная модалка
  detailModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
  },
  detailTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  alphaBetaChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#1976d2',
  },
  alphaBetaChipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailBody: {
    flex: 1,
  },
  detailContent: {
    padding: 20,
    paddingBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  referencesSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  referenceItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  referenceTitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  referenceLinkContainer: {
    marginTop: 6,
  },
  referenceLink: {
    fontSize: 12,
    color: '#1976d2',
    textDecorationLine: 'underline',
  },
  infoSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  detailFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  editDetailButton: {
    flex: 1,
    borderColor: '#1976d2',
  },
  deleteDetailButton: {
    flex: 1,
    backgroundColor: '#f44336',
  },
});