import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Attributes.module.css';

export default function Attributes() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [formData, setFormData] = useState({ name: '', isPrimary: false });
  const [expandedAttribute, setExpandedAttribute] = useState(null);
  const [newValue, setNewValue] = useState({ value: '', imageUrl: '' });
  const [message, setMessage] = useState(null);

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
        body: JSON.stringify(newValue)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Value added successfully!' });
        setNewValue({ value: '', imageUrl: '' });
        fetchAttributes();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add value' });
    }
  };

  const editAttribute = (attr) => {
    setEditingAttribute(attr);
    setFormData({ name: attr.name, isPrimary: attr.is_primary });
    setShowForm(true);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Attributes - Unlimited Options</title>
      </Head>

      <div className={styles.sidebar}>
        <h2>Menu</h2>
        <nav>
          <Link href="/" className={styles.navLink}>Products</Link>
          <Link href="/attributes" className={`${styles.navLink} ${styles.active}`}>Attributes</Link>
        </nav>
      </div>

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
                    <h4>Values</h4>
                    <div className={styles.addValueForm}>
                      <input
                        type="text"
                        placeholder="Value name"
                        value={newValue.value}
                        onChange={(e) => setNewValue({ ...newValue, value: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Image URL (optional)"
                        value={newValue.imageUrl}
                        onChange={(e) => setNewValue({ ...newValue, imageUrl: e.target.value })}
                      />
                      <button onClick={() => handleAddValue(attr.id)} className={styles.btnPrimary}>Add Value</button>
                    </div>

                    <div className={styles.valuesList}>
                      {attr.attribute_values?.map(val => (
                        <div key={val.id} className={styles.valueItem}>
                          {val.image_url && <img src={val.image_url} alt={val.value} className={styles.valueImage} />}
                          <span>{val.value}</span>
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
