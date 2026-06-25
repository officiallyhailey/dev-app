// Per-table field allowlist so the records proxy fetches only the fields each
// interface actually uses (smaller payloads + less data reaching the browser).
//
// Each list is the union of every field ID a page references, plus that table's
// primary field, plus any field looked up by name at runtime (Tools' Status,
// used to hide records). Tables not listed here fall back to fetching ALL fields,
// so a missing entry degrades to "slightly slower", never "missing data".
export const FIELD_PROJECTION: Record<string, string[]> = {
    // Cheat Sheets (tblHmB3Xzxyw30LyF) — primary fldNmVCq9ebpzSizH included
    tblHmB3Xzxyw30LyF: [
        'fld614HEtTeGT6yvl', 'fld6TTr5Ze1yDzPzJ', 'fld9eZUMcHeXSFWHj', 'fldFd0a8pfDGNWRmR',
        'fldNmVCq9ebpzSizH', 'fldPnjhzheunNLEfJ', 'fldSO2JgX19EW8g8M', 'fldSnhKbelBk5SHq6',
        'fldTOIrH31vN5msAQ', 'fldUE9rtv5uPfd0J6', 'fldnDzazt5K4iJMFJ', 'fldoiTd8rTBt9fkkb',
        'fldsbCfsapqHa3ieE', 'fldwuitvhSAqYbqWy', 'fldyC5ZOrpMjrYJdy',
    ],
    // Dev Work (tblE9HuJQySjf6ais) — primary fldK913cqfvcLYHju included
    tblE9HuJQySjf6ais: [
        'fld3Oa8qKUyt5cXf8', 'fld615lytIyK4Llr6', 'fldC06BUGgXtZ2g6E',
        'fldK913cqfvcLYHju', 'fldPB8a2e2tr8eFSz', 'fldvpbqAIq66D48Xl',
    ],
    // Agenda / Events (tbl6xGCwCI4XclP19) — primary fldI3nYLgvlcI58Ni included
    tbl6xGCwCI4XclP19: [
        'fld4c7r50yHXlL8kE', 'fldEBr4ENsFpsL5l1', 'fldEMXBETWH9vLKAp', 'fldFtw6r5ptWWMbCx',
        'fldGqgPyqKG0KDyUz', 'fldHSeh7u67uHAkrB', 'fldI3nYLgvlcI58Ni', 'fldM4Vsn5wgdWBrrJ',
        'fldNphx06K1wqxwxs', 'fldWJNvZcEGGYsKJx', 'fldWMqRKlLoxnRB7b', 'fldcbl2LMgIewlFad',
        'fldenlkAkfZsCIiyA', 'fldgfo9lUSwRHK8X1', 'fldhGh5rqGB582YT0', 'fldhiJhH4kW4t3VWX',
        'fldim1JZzcBvQt8fU', 'fldlVyy9qMqs5ySkk', 'fldoNX88tL54KqQG0', 'fldu6V63VtnDqRZeT',
        'fldu7ywo9jiTlXGVC',
    ],
    // Jobs (tblwmU2i7qOf6vioa) — primary fld8SBoxLd5uCfBaj included
    tblwmU2i7qOf6vioa: [
        'fld4Bb1qoErrpVdXq', 'fld5iKwdA7deQWEZy', 'fld8SBoxLd5uCfBaj', 'fldC0zsxhYswqv8xe',
        'fldDbwjKDzYQNVUY9', 'fldEczKmPXJKwSLVB', 'fldH7XHtz2GmndojY', 'fldLHsZ51pavW8Ar0',
        'fldUWMWaE12bf79iD', 'fldcT9S9Ae0vQLUOK', 'fldco5O5czDVfIKy3', 'fldu1lRRvgrffVBHF',
    ],
    // Tools (tbl0FXLrhpxXfI9Uv) — primary fldCbE7GVcOcLssGE + Status fldzBNfmK6WWZ9vvT (name-matched)
    tbl0FXLrhpxXfI9Uv: [
        'fld6jCbGrXbezIZ3z', 'fldCJurO2mwjpzbLB', 'fldCbE7GVcOcLssGE', 'fldOWiKkEmTNeTu6r',
        'fldQJ7YA7TKGV7qt6', 'fldQXlNg9MgevFYs5', 'fldbq0qCJ1p4wqfPj', 'fldf3PH45tTs8VcdG',
        'fldyUeKzyDa9y84tL', 'fldzBNfmK6WWZ9vvT',
    ],
};
