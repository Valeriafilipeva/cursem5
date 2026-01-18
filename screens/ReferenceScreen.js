import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Searchbar,
  Divider,
  TextInput, // Добавлен импорт TextInput
} from 'react-native-paper';
import { 
  getAllReferences,
  addReference,
  updateReference,
  deleteReference 
} from '../database/referenceRepo';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function ReferenceScreen({ navigation }) {
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingReference, setEditingReference] = useState(null);
  const [formData, setFormData] = useState({
    tissue: '',
    value: '',
    description: '',
  });

  // Загружаем справочник
  const loadReferences = async () => {
    try {
      setLoading(true);
      const data = await getAllReferences();
      const sorted = [...data].sort((a, b) => 
        (a.tissue || '').localeCompare(b.tissue || '')
      );
      setReferences(sorted);
    } catch (error) {
      console.error('Ошибка загрузки справочника:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить справочник');
      setReferences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadReferences();
    });

    return unsubscribe;
  }, [navigation]);

  // Фильтрация тканей
  const filteredReferences = references.filter(ref => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (ref.tissue && ref.tissue.toLowerCase().includes(query)) ||
      (ref.description && ref.description.toLowerCase().includes(query))
    );
  });

  // Функция для добавления новой ткани
  const showAddDialog = () => {
    setEditingReference(null);
    setFormData({
      tissue: '',
      value: '',
      description: '',
    });
    setDialogVisible(true);
  };

  // Функция для редактирования ткани
  const showEditDialog = (ref) => {
    setEditingReference(ref);
    setFormData({
      tissue: ref.tissue || '',
      value: ref.value || ref.alphaBeta?.toString() || '',
      description: ref.description || '',
    });
    setDialogVisible(true);
  };

  // Сохранение ткани
  const handleSave = async () => {
    if (!formData.tissue.trim()) {
      Alert.alert('Ошибка', 'Введите название ткани');
      return;
    }
    
    if (!formData.value.trim()) {
      Alert.alert('Ошибка', 'Введите значение α/β');
      return;
    }

    const alphaBetaValue = parseFloat(formData.value.replace(',', '.'));
    if (isNaN(alphaBetaValue) || alphaBetaValue <= 0) {
      Alert.alert('Ошибка', 'Значение α/β должно быть положительным числом');
      return;
    }

    try {
      const referenceData = {
        tissue: formData.tissue.trim(),
        alphaBeta: alphaBetaValue,
        description: formData.description.trim(),
      };

      if (editingReference) {
        await updateReference(editingReference.id, referenceData);
        Alert.alert('Успешно', 'Ткань обновлена');
      } else {
        await addReference(referenceData);
        Alert.alert('Успешно', 'Ткань добавлена');
      }

      setDialogVisible(false);
      loadReferences();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      const message = error.message.includes('UNIQUE') 
        ? 'Такая ткань уже существует' 
        : 'Не удалось сохранить ткань';
      Alert.alert('Ошибка', message);
    }
  };

  // Удаление ткани
  const handleDelete = (ref) => {
    Alert.alert(
      'Удалить ткань',
      `Удалить ткань "${ref.tissue}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReference(ref.id);
              await loadReferences();
              Alert.alert('Успешно', 'Ткань удалена');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить ткань');
            }
          }
        }
      ]
    );
  };

  // Использование в калькуляторе
  const handleUseInCalculator = (ref) => {
    navigation.navigate('Calculator', {
      presetAlphaBeta: ref.value || ref.alphaBeta
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>
          Загрузка справочника...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerSubtitle}>
          Значения для расчета BED/EQD₂
        </Text>
      </View>

      {/* Поиск */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Поиск по названию или описанию..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          iconColor="#1e40af"
          inputStyle={styles.searchInput}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Информация о количестве */}
        {searchQuery && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Найдено тканей: <Text style={styles.infoCount}>{filteredReferences.length}</Text>
            </Text>
          </View>
        )}

        {/* Список тканей */}
        {filteredReferences.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="inventory" size={64} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'Ничего не найдено' : 'Справочник пуст'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Попробуйте другой запрос' 
                : 'Начните с добавления первой ткани'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={showAddDialog}
                activeOpacity={0.8}
              >
                <Icon name="add" size={20} color="white" />
                <Text style={styles.addFirstButtonText}>Добавить ткань</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.referencesList}>
            {filteredReferences.map((ref) => (
              <View key={ref.id} style={styles.cardContainer}>
                <Card style={styles.referenceCard}>
                  <Card.Content>
                    {/* Заголовок карточки */}
                    <View style={styles.cardHeader}>
                      <View style={styles.tissueInfo}>
                        <Text style={styles.tissueName}>
                          {ref.tissue}
                        </Text>
                        <View style={styles.valueBadge}>
                          <Text style={styles.valueText}>
                            α/β = {ref.value || ref.alphaBeta}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => showEditDialog(ref)}
                        >
                          <Icon name="edit" size={20} color="#4B5563" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDelete(ref)}
                        >
                          <Icon name="delete" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Описание */}
                    {ref.description && (
                      <Text style={styles.tissueDescription}>
                        {ref.description}
                      </Text>
                    )}
                    
                    <Divider style={styles.cardDivider} />
                    
                    {/* Кнопка использования в калькуляторе */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.useButton}
                        onPress={() => handleUseInCalculator(ref)}
                        activeOpacity={0.8}
                      >
                        <Icon name="calculate" size={18} color="white" />
                        <Text style={styles.useButtonText}>Использовать в калькуляторе</Text>
                      </TouchableOpacity>
                    </View>
                  </Card.Content>
                </Card>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.spacer} />
      </ScrollView>

      {/* Кнопка добавления */}
      {filteredReferences.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={showAddDialog}
          activeOpacity={0.9}
        >
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Модальное окно добавления/редактирования */}
      {dialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Заголовок модалки */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReference ? 'Редактировать ткань' : 'Добавить новую ткань'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDialogVisible(false)}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Divider style={styles.modalDivider} />
            
            {/* Форма */}
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalForm}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.formLabel, styles.formLabelFirst]}>
                Название ткани <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={formData.tissue}
                  onChangeText={(text) => setFormData({...formData, tissue: text})}
                  style={styles.formInput}
                  mode="outlined"
                  placeholder="Например: Легкие"
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#1e40af"
                  autoFocus={!editingReference}
                />
              </View>
              
              <Text style={styles.formLabel}>
                Значение α/β <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={formData.value}
                  onChangeText={(text) => setFormData({...formData, value: text})}
                  keyboardType="decimal-pad"
                  style={styles.formInput}
                  mode="outlined"
                  placeholder="Например: 3.0"
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#1e40af"
                />
              </View>
              
              <Text style={styles.formLabel}>
                Описание (необязательно)
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                  multiline
                  numberOfLines={3}
                  style={styles.formTextArea}
                  mode="outlined"
                  placeholder="Дополнительная информация о ткани..."
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#1e40af"
                />
              </View>
            </ScrollView>
            
            <Divider style={styles.modalDivider} />
            
            {/* Кнопки модалки */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDialogVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Icon name="check" size={20} color="white" />
                <Text style={styles.saveButtonText}>
                  {editingReference ? 'Сохранить' : 'Добавить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerContainer: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 19,
    color: '#0c0c0e',
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
  },
  searchBar: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    elevation: 0,
    shadowOpacity: 0,
    height: 48,
  },
  searchInput: {
    fontSize: 15,
    color: '#374151',
  },
  infoContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFirstButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  referencesList: {
    marginBottom: 8,
  },
  cardContainer: {
    marginBottom: 16,
  },
  referenceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tissueInfo: {
    flex: 1,
    marginRight: 12,
  },
  tissueName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  valueBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
  },
  tissueDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardDivider: {
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  useButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    right: 20,
    bottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  modalDivider: {
    backgroundColor: '#F3F4F6',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalForm: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formLabelFirst: {
    marginTop: 0,
  },
  required: {
    color: '#EF4444',
  },
  formInput: {
    backgroundColor: 'white',
    fontSize: 15,
  },
  formTextArea: {
    backgroundColor: 'white',
    fontSize: 15,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1e40af',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  spacer: {
    height: 40,
  },
});