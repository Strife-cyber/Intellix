package reader

import (
	"archive/zip"
	"encoding/xml"
	"io"
	"strings"
)

type Paragraph struct {
	Text string `xml:",chardata"`
}

func readODT(filePath string) ([]string, error) {
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

	var contentFile *zip.File

	for _, f := range r.File {
		if f.Name == "content.xml" {
			contentFile = f
			break
		}
	}

	if contentFile == nil {
		return nil, err
	}

	rc, err := contentFile.Open()
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
			if se.Name.Local == "p" {
				var p Paragraph
				if err := decoder.DecodeElement(&p, &se); err != nil {
					text := strings.TrimSpace(p.Text)
					if text != "" {
						lines = append(lines, text)
					}
				}
			}
		}
	}

	return lines, nil
}
