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

  if (loading) {
    return (
      <div className={styles.container}>
        <Sidebar />
        <div className={styles.main}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner size="large" text="Loading attributes..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Attributes - Unlimited Options</title>
      </Head>

      <Sidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Attributes</h1>
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

        {message && (
          <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
            {message.text}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Attribute Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Color, Size, Material"
                required
              />
            </div>
            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                />
                Set as Primary Option (for recommendations)
              </label>
            </div>
            <button type="submit" className={styles.btnPrimary}>
              {editingAttribute ? 'Update' : 'Create'} Attribute
            </button>
          </form>
        )}

        <div className={styles.attributesList}>
          {attributes.length === 0 ? (
            <p className={styles.emptyState}>No attributes yet. Create one to get started!</p>
          ) : (
            attributes.map(attr => (
              <div key={attr.id} className={styles.attributeCard}>
                <div className={styles.attributeHeader}>
                  <div>
                    <h3>{attr.name}</h3>
                    {attr.is_primary && <span className={styles.primaryBadge}>Primary</span>}
                  </div>
                  <div className={styles.actions}>
                    <button onClick={() => setExpandedAttribute(expandedAttribute === attr.id ? null : attr.id)} className={styles.btnSecondary}>
                      {expandedAttribute === attr.id ? 'Collapse' : 'Manage Values'}
                    </button>
                    <button onClick={() => editAttribute(attr)} className={styles.btnSecondary}>Edit</button>
                    <button onClick={() => handleDelete(attr.id)} className={styles.btnDanger}>Delete</button>
                  </div>
                </div>

                {expandedAttribute === attr.id && (
                  <div className={styles.valuesSection}>
                    <div className={styles.valuesHeader}>
                      <h4>Values</h4>
                      <button
                        onClick={() => setBulkMode({ ...bulkMode, [attr.id]: !bulkMode[attr.id] })}
                        className={styles.btnSecondary}
                      >
                        {bulkMode[attr.id] ? 'Single Mode' : 'Bulk Add'}
                      </button>
                    </div>

                    {bulkMode[attr.id] ? (
                      <div className={styles.bulkValueForm}>
                        <textarea
                          placeholder="Enter values (one per line or comma-separated)&#10;Example:&#10;Small&#10;Medium&#10;Large&#10;&#10;Or: Small, Medium, Large"
                          value={bulkValues}
                          onChange={(e) => setBulkValues(e.target.value)}
                          rows={6}
                          className={styles.bulkTextarea}
                        />
                        <button onClick={() => handleBulkAddValues(attr.id)} className={styles.btnPrimary}>
                          Add All Values
                        </button>
                      </div>
                    ) : (
                      <div className={styles.addValueForm}>
                        <input
                          type="text"
                          placeholder="Value name"
                          value={newValue.value}
                          onChange={(e) => setNewValue({ value: e.target.value })}
                        />
                        <button onClick={() => handleAddValue(attr.id)} className={styles.btnPrimary}>Add Value</button>
                      </div>
                    )}

                    <div className={styles.valuesList}>
                      {attr.attribute_values?.map(val => (
                        <div key={val.id} className={styles.valueItem}>
                          {editingValue?.id === val.id ? (
                            <>
                              <input
                                type="text"
                                value={editingValue.value}
                                onChange={(e) => setEditingValue({ ...editingValue, value: e.target.value })}
                              />
                              <button onClick={handleUpdateValue} className={styles.btnPrimary}>Save</button>
                              <button onClick={() => setEditingValue(null)} className={styles.btnSecondary}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <span>{val.value}</span>
                              <button onClick={() => setEditingValue(val)} className={styles.btnEdit}>Edit</button>
                              <button onClick={() => handleDeleteValue(val.id)} className={styles.btnDelete}>×</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
