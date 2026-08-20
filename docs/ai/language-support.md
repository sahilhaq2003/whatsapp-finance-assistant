# Language Support

## Current Language Support Matrix

| Language | UI Support | Text Extraction | Voice Tested | Production Enabled | Known Limitations |
|----------|-----------|----------------|-------------|-------------------|-------------------|
| English | Yes | Yes | Yes (Whisper-1) | Yes | Primary language, full support |
| Sinhala | Partial (UI defaults) | No | No | No | No dedicated extraction prompts. LLM may partially understand if user writes in Sinhala via WhatsApp, but accuracy unvalidated. |
| Tamil | No | No | No | No | Not implemented. |
| Mixed (English+Sinhala) | No | Untested | No | No | Not production validated. |

---

## Design for Multilingual

The system architecture supports multilingual expansion without structural changes:

- **AI prompts** accept `businessCurrency` and `businessTimezone` parameters, allowing locale-aware extraction.
- **Whisper-1** accepts a `language` parameter for voice transcription.
- **Business model** has a `defaultLanguage` field.
- **User model** has a `preferredLanguage` field.

These extension points exist but are not yet utilized for non-English languages.

---

## Controlled Test Dataset Needs

Before enabling Sinhala or Tamil, the following must be validated with controlled test datasets:

| Test Area | Examples |
|-----------|---------|
| Mixed numerals | Sinhala numerals (ශ්‍රී ①②③) vs Arabic numerals (1, 2, 3) |
| Currency terminology | "Rs", "LKR", "රු", "rp" variations |
| Local expense terms | කෑම (food), ගමන් (travel), නිවාස (housing), etc. |
| Local business vocabulary | Industry-specific terms in Sinhala/Tamil |
| Voice accents | Sinhala/Tamil accent recognition with Whisper-1 |

---

## Recommendation

**MVP ships with English only.**

Multilingual enablement requires the following steps:

1. **Curated test dataset** for each target language with known-correct extractions.
2. **Whisper-1 accuracy testing** with Sri Lankan accents (Sinhala and Tamil).
3. **LLM extraction accuracy testing** with non-English input against the test dataset.
4. **UI translation** for all user-facing strings.
5. **Real-world validation** with native speakers before production enablement.

Skipping any of these steps risks silent accuracy degradation for non-English users.
