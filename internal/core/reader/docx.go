package reader

import (
	"archive/zip"
	"encoding/xml"
	"io"
	"strings"
)

func readDocx(filePath string) ([]string, error) {
	r, err := zip.OpenReader(filePath)
	if err != nil {
		return nil, err
	}
	defer func(r *zip.ReadCloser) {
		err := r.Close()
		if err != nil {
			return
		}
	}(r)

	var docFile *zip.File

	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			docFile = f
			break
		}
	}

	if docFile == nil {
		return nil, err
	}

	rc, err := docFile.Open()
	if err != nil {
		return nil, err
	}
	defer func(rc io.ReadCloser) {
		err := rc.Close()
		if err != nil {
			return
		}
	}(rc)

	decoder := xml.NewDecoder(rc)

	var lines []string
	var current strings.Builder

	for {
		tok, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}

		switch se := tok.(type) {

		case xml.StartElement:
			if se.Name.Local == "t" { // text node
				var text string
				if err := decoder.DecodeElement(&text, &se); err == nil {
					current.WriteString(text)
				}
			}

			if se.Name.Local == "p" {
				current.Reset()
			}

		case xml.EndElement:
			if se.Name.Local == "p" {
				line := strings.TrimSpace(current.String())
				if line != "" {
					lines = append(lines, line)
				}
			}
		}
	}

	return lines, nil
}

/*func readDocx(filePath string) ([]string, error) {
	doc, err := document.Open(filePath)
	if err != nil {
		return nil, err
	}

	defer func(doc *document.Document) {
		err := doc.Close()
		if err != nil {
			return
		}
	}(doc)

	var lines []string
	for _, para := range doc.Paragraphs() {
		var sb strings.Builder

		for _, run := range para.Runs() {
			sb.WriteString(run.Text())
		}

		text := strings.TrimSpace(sb.String())
		if text != "" {
			lines = append(lines, text)
		}
	}

	return lines, nil
}
*/
