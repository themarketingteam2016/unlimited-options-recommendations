import { useState, useEffect } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from '../styles/Attributes.module.css';

export default function Attributes() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [formData, setFormData] = useState({ name: '', isPrimary: false });
  const [expandedAttribute, setExpandedAttribute] = useState(null);
  const [newValue, setNewValue] = useState({ value: '' });
  const [editingValue, setEditingValue] = useState(null);
  const [message, setMessage] = useState(null);
  const [bulkMode, setBulkMode] = useState({});
  const [bulkValues, setBulkValues] = useState('');

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      const res = await fetch('/api/attributes');
      const data = await res.json();
      setAttributes(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      setAttributes([]);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingAttribute
        ? `/api/attributes/${editingAttribute.id}`
        : '/api/attributes';

      const method = editingAttribute ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Attribute ${editingAttribute ? 'updated' : 'created'} successfully!` });
        setShowForm(false);
        setFormData({ name: '', isPrimary: false });
        setEditingAttribute(null);
        fetchAttributes();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save attribute' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this attribute?')) return;

    try {
      const res = await fetch(`/api/attributes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Attribute deleted successfully!' });
        fetchAttributes();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete attribute' });
    }
  };

  const handleAddValue = async (attributeId) => {
    if (!newValue.value) return;

    try {
      const res = await fetch(`/api/attributes/${attributeId}/values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue.value })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Value added successfully!' });
        setNewValue({ value: '' });
        fetchAttributes();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add value' });
    }
  };

  const handleBulkAddValues = async (attributeId) => {
    if (!bulkValues.trim()) return;

    try {
      // Parse values - support both comma-separated and newline-separated
      const valuesList = bulkValues
        .split(/[\n,]/)
        .map(v => v.trim())
        .filter(v => v.length > 0);

      if (valuesList.length === 0) return;

      // Add each value
      for (const value of valuesList) {
        await fetch(`/api/attributes/${attributeId}/values`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        });
      }

      setMessage({ type: 'success', text: `Added ${valuesList.length} values successfully!` });
      setBulkValues('');
      setBulkMode({ ...bulkMode, [attributeId]: false });
      fetchAttributes();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add bulk values' });
    }
  };

  const handleUpdateValue = async () => {
    if (!editingValue) return;

    try {
      const res = await fetch(`/api/attributes/values/${editingValue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editingValue.value })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Value updated successfully!' });
        setEditingValue(null);
        fetchAttributes();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update value' });
    }
  };

  const handleDeleteValue = async (valueId) => {
    if (!confirm('Delete this value?')) return;

    try {
      const res = await fetch(`/api/attributes/values/${valueId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Value deleted successfully!' });
        fetchAttributes();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete value' });
    }
  };

  const editAttribute = (attr) => {
    setEditingAttribute(attr);
    setFormData({ name: attr.name, isPrimary: attr.is_primary });
    setShowForm(true);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Attributes - Unlimited Options</title>
      </Head>

      <Sidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1>Attributes</h1>
            <p className={styles.description}>Manage product attributes and their values</p>
          </div>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              setShowForm(!showForm);
              setEditingAttribute(null);
              setFormData({ name: '', isPrimary: false });
            }}
          >
            {showForm ? 'Cancel' : '+ New Attribute'}
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <LoadingSpinner size="large" text="Loading attributes..." />
          </div>
        ) : (
          <>

        {message && (
          <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
            {message.text}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formHeader}>
              <h3>{editingAttribute ? 'Edit Attribute' : 'Create New Attribute'}</h3>
              <p className={styles.formDescription}>
                {editingAttribute
                  ? 'Update the attribute name and settings'
                  : 'Attributes are product options like Size, Color, or Material that customers can choose from'
                }
              </p>
            </div>
            <div className={styles.inputGroup}>
              <label>What type of option is this?</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Size, Color, Material, Style"
                required
              />
              <span className={styles.inputHint}>This will be shown to customers when they select options</span>
            </div>
            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                />
                <div>
                  <strong>Set as primary attribute</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6d7175' }}>
                    The primary attribute is used for product recommendations (usually Size or Color)
                  </p>
                </div>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className={styles.btnPrimary}>
                {editingAttribute ? '✓ Update Attribute' : '+ Create Attribute'}
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setShowForm(false);
                  setEditingAttribute(null);
                  setFormData({ name: '', isPrimary: false });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className={styles.attributesList}>
          {attributes.length === 0 ? (
            <div className={styles.emptyStateCard}>
              <div className={styles.emptyStateIcon}>🏷️</div>
              <h3>No attributes yet</h3>
              <p>Attributes are options like Size, Color, or Material that customers can choose for your products.</p>
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  setShowForm(true);
                  setEditingAttribute(null);
                  setFormData({ name: '', isPrimary: false });
                }}
              >
                Create Your First Attribute
              </button>
            </div>
          ) : (
            attributes.map(attr => (
              <div key={attr.id} className={styles.attributeCard}>
                <div className={styles.attributeHeader}>
                  <div className={styles.attributeTitleRow}>
                    <h3>{attr.name}</h3>
                    {attr.is_primary && (
                      <span className={styles.primaryBadge} title="This is the main option for product recommendations">
                        ⭐ Primary
                      </span>
                    )}
                    <span className={styles.valueCount}>
                      {attr.attribute_values?.length || 0} {attr.attribute_values?.length === 1 ? 'option' : 'options'}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    <button onClick={() => editAttribute(attr)} className={styles.btnEdit} title="Edit attribute name">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(attr.id)} className={styles.btnDanger} title="Delete this attribute">
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <div className={styles.valuesSection}>
                  {/* Quick Add Form - Always Visible */}
                  <div className={styles.quickAddSection}>
                    <h4>Add New Option</h4>
                    <div className={styles.addValueForm}>
                      <input
                        type="text"
                        placeholder={`e.g., ${attr.name === 'Size' ? 'Small, Medium, Large' : attr.name === 'Color' ? 'Red, Blue, Green' : 'Option name'}`}
                        value={newValue.value}
                        onChange={(e) => setNewValue({ value: e.target.value })}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddValue(attr.id);
                          }
                        }}
                      />
                      <button onClick={() => handleAddValue(attr.id)} className={styles.btnPrimary}>+ Add</button>
                    </div>
                    {!bulkMode[attr.id] && (
                      <button
                        onClick={() => setBulkMode({ ...bulkMode, [attr.id]: true })}
                        className={styles.linkButton}
                      >
                        Or add multiple options at once
                      </button>
                    )}
                  </div>

                  {/* Bulk Add Form - Show when activated */}
                  {bulkMode[attr.id] && (
                    <div className={styles.bulkValueForm}>
                      <h4>Add Multiple Options</h4>
                      <p className={styles.helpText}>Enter multiple options separated by commas or one per line</p>
                      <textarea
                        placeholder="Small, Medium, Large&#10;or&#10;Small&#10;Medium&#10;Large"
                        value={bulkValues}
                        onChange={(e) => setBulkValues(e.target.value)}
                        rows={4}
                        className={styles.bulkTextarea}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleBulkAddValues(attr.id)} className={styles.btnPrimary}>
                          Add All Options
                        </button>
                        <button
                          onClick={() => {
                            setBulkMode({ ...bulkMode, [attr.id]: false });
                            setBulkValues('');
                          }}
                          className={styles.btnSecondary}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing Values List */}
                  {attr.attribute_values && attr.attribute_values.length > 0 && (
                    <div className={styles.existingValuesSection}>
                      <h4>Current Options ({attr.attribute_values.length})</h4>
                      <div className={styles.valuesList}>
                        {attr.attribute_values.map(val => (
                          <div key={val.id} className={styles.valueItem}>
                            {editingValue?.id === val.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editingValue.value}
                                  onChange={(e) => setEditingValue({ ...editingValue, value: e.target.value })}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleUpdateValue();
                                    }
                                  }}
                                  autoFocus
                                />
                                <button onClick={handleUpdateValue} className={styles.btnSave} title="Save changes">✓</button>
                                <button onClick={() => setEditingValue(null)} className={styles.btnCancel} title="Cancel">✕</button>
                              </>
                            ) : (
                              <>
                                <span className={styles.valueName}>{val.value}</span>
                                <div className={styles.valueActions}>
                                  <button onClick={() => setEditingValue(val)} className={styles.btnEditSmall} title="Edit">✏️</button>
                                  <button onClick={() => handleDeleteValue(val.id)} className={styles.btnDeleteSmall} title="Delete">🗑️</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {attr.attribute_values?.length === 0 && (
                    <div className={styles.noValuesMessage}>
                      <p>No options yet. Add your first option above.</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        </>
        )}
      </main>
    </div>
  );
}
