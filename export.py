#!/usr/bin/env python3
"""
Export annotations from SQLite database to CVAT 1.1 XML format
Usage: python export_annotations.py [options]

Options:
  --output-dir DIR    Output directory for XML files (default: ./annotations)
  --single FILE       Export all annotations to a single XML file
  --image NAME        Export only specific image
"""

import sqlite3
import json
import os
import argparse
from pathlib import Path


def boxes_to_cvat_xml(image_name, boxes, width=None, height=None, image_id=0):
    """Convert boxes to CVAT 1.1 XML format for a single image"""
    # Use provided dimensions or defaults
    w = width if width is not None else 1920
    h = height if height is not None else 1080
    
    xml = f'  <image id="{image_id}" name="{image_name}" width="{w}" height="{h}">\n'
    
    for box in boxes:
        xtl = round(box['x'])
        ytl = round(box['y'])
        xbr = round(box['x'] + box['width'])
        ybr = round(box['y'] + box['height'])
        occluded = '1' if box.get('occluded', False) else '0'
        
        xml += f'    <box label="object" occluded="{occluded}" source="manual" '
        xml += f'xtl="{xtl}" ytl="{ytl}" xbr="{xbr}" ybr="{ybr}" z_order="0">\n'
        
        # Add color attribute if present
        if 'color' in box:
            xml += f'      <attribute name="color">{box["color"]}</attribute>\n'
        
        xml += '    </box>\n'
    
    xml += '  </image>\n'
    return xml


def create_cvat_header():
    """Create CVAT XML header"""
    return '''<?xml version="1.0" encoding="utf-8"?>
<annotations>
  <version>1.1</version>
  <meta>
    <task>
      <name>annotation_task</name>
      <size>1</size>
    </task>
  </meta>
'''


def create_cvat_footer():
    """Create CVAT XML footer"""
    return '</annotations>'


def export_single_file(db_path, output_file):
    """Export all annotations to a single CVAT XML file"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('SELECT image_name, boxes, width, height FROM annotations ORDER BY image_name')
    rows = cursor.fetchall()
    
    if not rows:
        print("No annotations found in database")
        conn.close()
        return
    
    xml = create_cvat_header()
    
    for idx, (image_name, boxes_json, width, height) in enumerate(rows):
        boxes = json.loads(boxes_json)
        if boxes:  # Only include images with boxes
            xml += boxes_to_cvat_xml(image_name, boxes, width, height, image_id=idx)
    
    xml += create_cvat_footer()
    
    # Write to file
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml)
    
    conn.close()
    print(f"✅ Exported {len(rows)} annotations to: {output_path}")


def export_separate_files(db_path, output_dir):
    """Export each annotation to a separate XML file"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('SELECT image_name, boxes, width, height FROM annotations')
    rows = cursor.fetchall()
    
    if not rows:
        print("No annotations found in database")
        conn.close()
        return
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    exported_count = 0
    
    for image_name, boxes_json, width, height in rows:
        boxes = json.loads(boxes_json)
        
        if not boxes:
            continue
        
        # Create XML for this image
        xml = create_cvat_header()
        xml += boxes_to_cvat_xml(image_name, boxes, width, height, image_id=0)
        xml += create_cvat_footer()
        
        # Generate output filename
        base_name = Path(image_name).stem
        xml_filename = output_path / f'{base_name}.xml'
        
        with open(xml_filename, 'w', encoding='utf-8') as f:
            f.write(xml)
        
        exported_count += 1
        print(f"  ✓ {xml_filename.name}")
    
    conn.close()
    print(f"\n✅ Exported {exported_count} annotation files to: {output_path}")


def export_single_image(db_path, image_name, output_file=None):
    """Export annotations for a single image"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('SELECT boxes, width, height FROM annotations WHERE image_name = ?', (image_name,))
    row = cursor.fetchone()
    
    if not row:
        print(f"❌ No annotations found for image: {image_name}")
        conn.close()
        return
    
    boxes_json, width, height = row
    boxes = json.loads(boxes_json)
    
    if not boxes:
        print(f"⚠️  Image {image_name} has no boxes")
        conn.close()
        return
    
    # Create XML
    xml = create_cvat_header()
    xml += boxes_to_cvat_xml(image_name, boxes, width, height, image_id=0)
    xml += create_cvat_footer()
    
    # Determine output file
    if output_file is None:
        base_name = Path(image_name).stem
        output_file = f'{base_name}.xml'
    
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml)
    
    conn.close()
    print(f"✅ Exported annotations for {image_name} to: {output_path}")


def list_annotations(db_path):
    """List all images with annotations"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT image_name, 
               json_array_length(boxes) as box_count,
               datetime(updated_at, 'localtime') as last_updated
        FROM annotations 
        ORDER BY updated_at DESC
    ''')
    
    rows = cursor.fetchall()
    
    if not rows:
        print("No annotations found in database")
        conn.close()
        return
    
    print(f"\n📊 Found {len(rows)} annotated images:\n")
    print(f"{'Image Name':<40} {'Boxes':<10} {'Last Updated'}")
    print("-" * 70)
    
    for image_name, box_count, updated_at in rows:
        print(f"{image_name:<40} {box_count:<10} {updated_at}")
    
    conn.close()


def main():
    parser = argparse.ArgumentParser(
        description='Export annotations from SQLite to CVAT XML format',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # List all annotations
  python export_annotations.py --list

  # Export each image to separate XML files
  python export_annotations.py --output-dir ./annotations

  # Export all to a single XML file
  python export_annotations.py --single all_annotations.xml

  # Export specific image
  python export_annotations.py --image photo.jpg
        '''
    )
    
    parser.add_argument('--db', default='annotations.db', 
                       help='Path to SQLite database (default: annotations.db)')
    parser.add_argument('--output-dir', default='./annotations',
                       help='Output directory for separate XML files (default: ./annotations)')
    parser.add_argument('--single', metavar='FILE',
                       help='Export all annotations to a single XML file')
    parser.add_argument('--image', metavar='NAME',
                       help='Export only specific image')
    parser.add_argument('--list', action='store_true',
                       help='List all annotations in database')
    
    args = parser.parse_args()
    
    db_path = Path(args.db)
    
    if not db_path.exists():
        print(f"❌ Database not found: {db_path}")
        print(f"   Make sure you're in the correct directory")
        return
    
    # List mode
    if args.list:
        list_annotations(db_path)
        return
    
    # Single image mode
    if args.image:
        export_single_image(db_path, args.image)
        return
    
    # Single file mode
    if args.single:
        export_single_file(db_path, args.single)
        return
    
    # Default: separate files mode
    export_separate_files(db_path, args.output_dir)


if __name__ == '__main__':
    main()